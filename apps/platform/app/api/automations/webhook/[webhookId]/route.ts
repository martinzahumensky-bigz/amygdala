import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import { getAutomationEngine } from '@/lib/automations';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    const supabase = getAmygdalaClient();

    // Find webhook record
    const { data: webhook, error: webhookError } = await supabase
      .from('automation_webhooks')
      .select('*, automations!inner(*)')
      .eq('webhook_id', webhookId)
      .single();

    if (webhookError || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Validate secret if configured
    if (webhook.secret) {
      const signature = request.headers.get('x-webhook-signature');
      const body = await request.text();

      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // Parse body after validation
      var payload = JSON.parse(body);
    } else {
      var payload = await request.json().catch(() => ({}));
    }

    // Check if automation is enabled
    const automation = webhook.automations;
    if (!automation.enabled) {
      return NextResponse.json(
        { error: 'Automation is disabled', automation_id: automation.id },
        { status: 400 }
      );
    }

    // Update webhook stats
    await supabase
      .from('automation_webhooks')
      .update({
        last_called_at: new Date().toISOString(),
        call_count: webhook.call_count + 1,
      })
      .eq('id', webhook.id);

    // Execute automation
    const engine = getAutomationEngine();
    const run = await engine.executeOnWebhook(automation.id, payload);

    return NextResponse.json({
      success: true,
      run_id: run.id,
      status: run.status,
      records_processed: run.records_processed,
    });
  } catch (error) {
    console.error('Webhook trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET to check webhook status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    const supabase = getAmygdalaClient();

    const { data: webhook, error } = await supabase
      .from('automation_webhooks')
      .select('webhook_id, last_called_at, call_count, automation_id')
      .eq('webhook_id', webhookId)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({
      webhook_id: webhook.webhook_id,
      automation_id: webhook.automation_id,
      last_called_at: webhook.last_called_at,
      call_count: webhook.call_count,
      status: 'active',
    });
  } catch (error) {
    console.error('Get webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
