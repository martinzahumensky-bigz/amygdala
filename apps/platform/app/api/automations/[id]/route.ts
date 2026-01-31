import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import { getAutomationEngine } from '@/lib/automations';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getAmygdalaClient();

    const { data: automation, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Get recent runs
    const { data: recentRuns } = await supabase
      .from('automation_runs')
      .select('*')
      .eq('automation_id', id)
      .order('started_at', { ascending: false })
      .limit(10);

    // Get schedule if exists
    const { data: schedule } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('automation_id', id)
      .single();

    // Get webhook if exists
    const { data: webhook } = await supabase
      .from('automation_webhooks')
      .select('webhook_id, last_called_at, call_count')
      .eq('automation_id', id)
      .single();

    return NextResponse.json({
      ...automation,
      recent_runs: recentRuns || [],
      schedule,
      webhook: webhook
        ? {
            ...webhook,
            url: `/api/automations/webhook/${webhook.webhook_id}`,
          }
        : null,
    });
  } catch (error) {
    console.error('Get automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getAmygdalaClient();

    // Remove fields that shouldn't be updated directly
    const { id: _, created_at, created_by, run_count, last_run_at, ...updateData } = body;

    const { data: automation, error } = await supabase
      .from('automations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update automation: ${error.message}`);
    }

    // Update schedule if trigger changed
    if (updateData.trigger?.type === 'scheduled') {
      const nextRunAt = calculateNextRunTime(updateData.trigger.interval);

      const { data: existingSchedule } = await supabase
        .from('automation_schedules')
        .select('id')
        .eq('automation_id', id)
        .single();

      if (existingSchedule) {
        await supabase
          .from('automation_schedules')
          .update({ next_run_at: nextRunAt })
          .eq('automation_id', id);
      } else {
        await supabase.from('automation_schedules').insert({
          automation_id: id,
          next_run_at: nextRunAt,
        });
      }
    }

    return NextResponse.json(automation);
  } catch (error) {
    console.error('Update automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getAmygdalaClient();

    // Delete automation (cascade will handle related records)
    const { error } = await supabase.from('automations').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete automation: ${error.message}`);
    }

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('Delete automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST to this endpoint triggers a manual run
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { dryRun = false, triggerData = {} } = body;

    const engine = getAutomationEngine();

    if (dryRun) {
      // Preview mode
      const preview = await engine.preview(id, triggerData);
      return NextResponse.json({ preview });
    }

    // Execute automation
    const run = await engine.execute(id, {
      triggerType: 'manual',
      triggeredAt: new Date().toISOString(),
      ...triggerData,
    });

    return NextResponse.json(run);
  } catch (error) {
    console.error('Run automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateNextRunTime(interval: {
  type: string;
  value: number | string;
  at?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}): string {
  const now = new Date();

  switch (interval.type) {
    case 'minutes':
      return new Date(now.getTime() + Number(interval.value) * 60 * 1000).toISOString();

    case 'hours':
      return new Date(now.getTime() + Number(interval.value) * 60 * 60 * 1000).toISOString();

    case 'days': {
      const next = new Date(now);
      if (interval.at) {
        const [hours, minutes] = interval.at.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      } else {
        next.setDate(next.getDate() + Number(interval.value));
      }
      return next.toISOString();
    }

    default:
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
}
