import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import { nanoid } from 'nanoid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const enabled = searchParams.get('enabled');
    const triggerType = searchParams.get('trigger_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build the query
    let query = supabase
      .from('automations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (enabled !== null && enabled !== 'all') {
      query = query.eq('enabled', enabled === 'true');
    }

    if (triggerType && triggerType !== 'all') {
      query = query.contains('trigger', { type: triggerType });
    }

    const { data: automations, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch automations: ${error.message}`);
    }

    // Get recent run stats for each automation
    const automationIds = automations?.map(a => a.id) || [];
    let runStats: Record<string, { total: number; success: number; failed: number; lastRun?: string }> = {};

    if (automationIds.length > 0) {
      const { data: runs } = await supabase
        .from('automation_runs')
        .select('automation_id, status, started_at')
        .in('automation_id', automationIds)
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('started_at', { ascending: false });

      runs?.forEach(r => {
        if (!runStats[r.automation_id]) {
          runStats[r.automation_id] = { total: 0, success: 0, failed: 0 };
        }
        runStats[r.automation_id].total++;
        if (r.status === 'success') runStats[r.automation_id].success++;
        if (r.status === 'failed') runStats[r.automation_id].failed++;
        if (!runStats[r.automation_id].lastRun) {
          runStats[r.automation_id].lastRun = r.started_at;
        }
      });
    }

    // Enrich automations with run stats
    const enrichedAutomations = automations?.map(a => ({
      ...a,
      run_stats: runStats[a.id] || { total: 0, success: 0, failed: 0 },
    })) || [];

    // Get summary counts
    const { data: allAutomations } = await supabase
      .from('automations')
      .select('enabled, trigger');

    const enabledCount = allAutomations?.filter(a => a.enabled).length || 0;
    const disabledCount = allAutomations?.filter(a => !a.enabled).length || 0;

    const triggerCounts: Record<string, number> = {};
    allAutomations?.forEach(a => {
      const type = (a.trigger as { type?: string })?.type || 'unknown';
      triggerCounts[type] = (triggerCounts[type] || 0) + 1;
    });

    return NextResponse.json({
      automations: enrichedAutomations,
      total: count || 0,
      limit,
      offset,
      summary: {
        enabled: enabledCount,
        disabled: disabledCount,
        triggerCounts,
      },
    });
  } catch (error) {
    console.error('Automations list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      enabled = true,
      trigger,
      conditions = [],
      actions,
      settings = { errorHandling: 'notify' },
      created_by = 'user',
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!trigger) {
      return NextResponse.json({ error: 'Trigger is required' }, { status: 400 });
    }
    if (!actions || actions.length === 0) {
      return NextResponse.json({ error: 'At least one action is required' }, { status: 400 });
    }

    const supabase = getAmygdalaClient();

    // Create the automation
    const { data: automation, error } = await supabase
      .from('automations')
      .insert({
        name,
        description,
        enabled,
        trigger,
        conditions,
        actions,
        settings,
        created_by,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create automation: ${error.message}`);
    }

    // If trigger is webhook, create webhook record
    if (trigger.type === 'webhook') {
      const webhookId = nanoid(12);
      await supabase
        .from('automation_webhooks')
        .insert({
          automation_id: automation.id,
          webhook_id: webhookId,
          secret: trigger.secret,
        });

      // Update automation with webhook ID in trigger
      await supabase
        .from('automations')
        .update({
          trigger: { ...trigger, webhookId },
        })
        .eq('id', automation.id);
    }

    // If trigger is scheduled, create schedule record
    if (trigger.type === 'scheduled') {
      const nextRunAt = calculateNextRunTime(trigger.interval);
      await supabase
        .from('automation_schedules')
        .insert({
          automation_id: automation.id,
          next_run_at: nextRunAt,
        });
    }

    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    console.error('Create automation error:', error);
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

    case 'weeks': {
      const next = new Date(now);
      if (interval.daysOfWeek && interval.daysOfWeek.length > 0) {
        // Find next matching day
        for (let i = 1; i <= 7; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(checkDate.getDate() + i);
          if (interval.daysOfWeek.includes(checkDate.getDay())) {
            next.setDate(checkDate.getDate());
            break;
          }
        }
      } else {
        next.setDate(next.getDate() + Number(interval.value) * 7);
      }
      if (interval.at) {
        const [hours, minutes] = interval.at.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      }
      return next.toISOString();
    }

    case 'months': {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      if (interval.dayOfMonth) {
        next.setDate(Math.min(interval.dayOfMonth, getDaysInMonth(next)));
      }
      if (interval.at) {
        const [hours, minutes] = interval.at.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
      }
      return next.toISOString();
    }

    case 'cron':
      // For cron, we'd need a proper cron parser - for now, default to 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    default:
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  }
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
