/**
 * Automation Engine for Amygdala
 * Orchestrates automation execution: triggers -> conditions -> actions
 */

import { getAmygdalaClient } from '@/lib/supabase/client';
import {
  Automation,
  AutomationRun,
  AutomationRunStatus,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationActionResult,
  ScheduledTrigger,
  RecordMatchesTrigger,
} from '@amygdala/database';
import { parseTokensDeep, TokenContext } from './tokenParser';
import { evaluateConditions, filterRecords, EvaluationContext } from './evaluator';
import { executeActions, ActionExecutionContext } from './actions';

// Rate limiting
const AUTOMATION_LIMITS = {
  maxRunsPerHour: 100,
  maxActionsPerRun: 20,
  webhookTimeout: 10000,
  cooldownMinutes: 1,
};

export interface AutomationEngineOptions {
  dryRun?: boolean;
  maxActions?: number;
}

export class AutomationEngine {
  private supabase = getAmygdalaClient();

  /**
   * Execute an automation manually or via trigger
   */
  async execute(
    automationId: string,
    triggerData?: Record<string, unknown>,
    options: AutomationEngineOptions = {}
  ): Promise<AutomationRun> {
    // Load automation
    const automation = await this.loadAutomation(automationId);

    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    if (!automation.enabled && !options.dryRun) {
      throw new Error(`Automation is disabled: ${automation.name}`);
    }

    // Check rate limits
    await this.checkRateLimits(automation);

    // Create run record
    const runId = await this.createRun(automation, triggerData);

    try {
      // Get records to process based on trigger type
      const records = await this.getRecordsToProcess(automation.trigger, triggerData);

      // If no records and trigger expects records, skip
      if (records.length === 0 && this.triggerExpectsRecords(automation.trigger)) {
        await this.completeRun(runId, 'skipped', [], 0, 'No matching records found');
        return this.loadRun(runId);
      }

      // Process records (or single execution for scheduled)
      const allResults: AutomationActionResult[] = [];
      let recordsProcessed = 0;

      if (records.length > 0) {
        // Process each matching record
        for (const record of records) {
          // Evaluate conditions
          const conditionsMet = evaluateConditions(automation.conditions, { record });

          if (!conditionsMet) {
            continue;
          }

          // Build execution context
          const context = this.buildExecutionContext(automation, record, triggerData, allResults, options);

          // Execute actions
          const results = await this.executeWithLimits(
            automation.actions,
            context,
            options.maxActions || AUTOMATION_LIMITS.maxActionsPerRun
          );

          allResults.push(...results);
          recordsProcessed++;

          // Check if any action failed
          if (results.some(r => r.status === 'failed')) {
            if (automation.settings.errorHandling === 'stop') {
              break;
            }
          }
        }
      } else {
        // Execute without record context (scheduled trigger with no record_matches)
        const context = this.buildExecutionContext(automation, undefined, triggerData, [], options);

        const results = await this.executeWithLimits(
          automation.actions,
          context,
          options.maxActions || AUTOMATION_LIMITS.maxActionsPerRun
        );

        allResults.push(...results);
        recordsProcessed = 1;
      }

      // Determine final status
      const hasFailures = allResults.some(r => r.status === 'failed');
      const status: AutomationRunStatus = hasFailures ? 'failed' : 'success';

      // Complete run
      await this.completeRun(runId, status, allResults, recordsProcessed);

      // Update automation stats
      await this.updateAutomationStats(automationId);

      return this.loadRun(runId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.completeRun(runId, 'failed', [], 0, errorMessage);
      throw error;
    }
  }

  /**
   * Execute a scheduled automation
   */
  async executeScheduled(automationId: string): Promise<AutomationRun> {
    return this.execute(automationId, {
      triggerType: 'scheduled',
      triggeredAt: new Date().toISOString(),
    });
  }

  /**
   * Execute on record event (created/updated)
   */
  async executeOnRecordEvent(
    automationId: string,
    eventType: 'created' | 'updated',
    record: Record<string, unknown>,
    changedFields?: string[]
  ): Promise<AutomationRun> {
    return this.execute(automationId, {
      triggerType: `record_${eventType}`,
      triggeredAt: new Date().toISOString(),
      record,
      changedFields,
    });
  }

  /**
   * Execute on agent completion
   */
  async executeOnAgentComplete(
    automationId: string,
    agentName: string,
    runResult: Record<string, unknown>
  ): Promise<AutomationRun> {
    return this.execute(automationId, {
      triggerType: 'agent_completed',
      triggeredAt: new Date().toISOString(),
      agentName,
      runResult,
    });
  }

  /**
   * Execute on webhook call
   */
  async executeOnWebhook(
    automationId: string,
    webhookPayload: Record<string, unknown>
  ): Promise<AutomationRun> {
    return this.execute(automationId, {
      triggerType: 'webhook',
      triggeredAt: new Date().toISOString(),
      payload: webhookPayload,
    });
  }

  /**
   * Preview automation execution without actually running
   */
  async preview(
    automationId: string,
    triggerData?: Record<string, unknown>
  ): Promise<{
    records: Record<string, unknown>[];
    matchingRecords: number;
    actions: AutomationAction[];
    estimatedDuration: string;
  }> {
    const automation = await this.loadAutomation(automationId);

    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    const records = await this.getRecordsToProcess(automation.trigger, triggerData);
    const matchingRecords = filterRecords(records, automation.conditions);

    return {
      records: matchingRecords.slice(0, 10), // Preview first 10
      matchingRecords: matchingRecords.length,
      actions: automation.actions,
      estimatedDuration: this.estimateDuration(automation.actions, matchingRecords.length),
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private async loadAutomation(id: string): Promise<Automation | null> {
    const { data, error } = await this.supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      trigger: data.trigger as AutomationTrigger,
      conditions: (data.conditions || []) as AutomationCondition[],
      actions: data.actions as AutomationAction[],
      settings: data.settings || { errorHandling: 'notify' },
    } as Automation;
  }

  private async loadRun(id: string): Promise<AutomationRun> {
    const { data, error } = await this.supabase
      .from('automation_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(`Run not found: ${id}`);
    }

    return data as AutomationRun;
  }

  private async createRun(
    automation: Automation,
    triggerData?: Record<string, unknown>
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('automation_runs')
      .insert({
        automation_id: automation.id,
        trigger_type: automation.trigger.type,
        trigger_data: triggerData,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create run: ${error.message}`);
    }

    return data.id;
  }

  private async completeRun(
    runId: string,
    status: AutomationRunStatus,
    results: AutomationActionResult[],
    recordsProcessed: number,
    errorMessage?: string
  ): Promise<void> {
    const completedAt = new Date().toISOString();

    // Calculate duration
    const { data: run } = await this.supabase
      .from('automation_runs')
      .select('started_at')
      .eq('id', runId)
      .single();

    const startedAt = run?.started_at ? new Date(run.started_at) : new Date();
    const durationMs = Date.now() - startedAt.getTime();

    await this.supabase
      .from('automation_runs')
      .update({
        status,
        actions_executed: results,
        records_processed: recordsProcessed,
        error_message: errorMessage,
        completed_at: completedAt,
        duration_ms: durationMs,
      })
      .eq('id', runId);
  }

  private async updateAutomationStats(automationId: string): Promise<void> {
    // Get current run count and increment
    const { data: automation } = await this.supabase
      .from('automations')
      .select('run_count')
      .eq('id', automationId)
      .single();

    const newRunCount = (automation?.run_count || 0) + 1;

    // Update automation with new stats
    await this.supabase
      .from('automations')
      .update({
        last_run_at: new Date().toISOString(),
        run_count: newRunCount,
      })
      .eq('id', automationId);
  }

  private async checkRateLimits(automation: Automation): Promise<void> {
    // Check cooldown
    if (automation.settings.cooldownMinutes && automation.last_run_at) {
      const lastRun = new Date(automation.last_run_at);
      const cooldownMs = automation.settings.cooldownMinutes * 60 * 1000;
      const timeSinceLastRun = Date.now() - lastRun.getTime();

      if (timeSinceLastRun < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastRun) / 1000);
        throw new Error(`Cooldown active. Please wait ${waitSeconds} seconds.`);
      }
    }

    // Check hourly run limit
    if (automation.settings.runLimit) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { count } = await this.supabase
        .from('automation_runs')
        .select('id', { count: 'exact', head: true })
        .eq('automation_id', automation.id)
        .gte('started_at', oneHourAgo);

      if (count && count >= automation.settings.runLimit) {
        throw new Error(`Run limit reached: ${automation.settings.runLimit} runs per hour`);
      }
    }
  }

  private async getRecordsToProcess(
    trigger: AutomationTrigger,
    triggerData?: Record<string, unknown>
  ): Promise<Record<string, unknown>[]> {
    // If trigger data includes a record, use it
    if (triggerData?.record) {
      return [triggerData.record as Record<string, unknown>];
    }

    // For record_matches trigger, query matching records
    if (trigger.type === 'record_matches') {
      const matchesTrigger = trigger as RecordMatchesTrigger;
      return this.queryMatchingRecords(matchesTrigger);
    }

    // For scheduled triggers, might need to query based on conditions
    if (trigger.type === 'scheduled') {
      // Check if there's an entityType hint in trigger data
      // For now, return empty - conditions will be evaluated later
      return [];
    }

    return [];
  }

  private async queryMatchingRecords(trigger: RecordMatchesTrigger): Promise<Record<string, unknown>[]> {
    const tableName = this.getTableName(trigger.entityType);

    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .limit(100); // Safety limit

    if (error) {
      console.error('Error querying records:', error);
      return [];
    }

    // Filter by trigger conditions
    return filterRecords(data || [], trigger.conditions);
  }

  private triggerExpectsRecords(trigger: AutomationTrigger): boolean {
    return ['record_created', 'record_updated', 'record_matches'].includes(trigger.type);
  }

  private buildExecutionContext(
    automation: Automation,
    record: Record<string, unknown> | undefined,
    triggerData: Record<string, unknown> | undefined,
    previousResults: AutomationActionResult[],
    options: AutomationEngineOptions
  ): ActionExecutionContext {
    const tokenContext: TokenContext = {
      record,
      trigger: {
        type: automation.trigger.type,
        timestamp: new Date().toISOString(),
        data: triggerData,
      },
      automation: {
        name: automation.name,
        id: automation.id,
      },
      env: {
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL || '',
      },
    };

    const evaluationContext: EvaluationContext = {
      record,
      ...triggerData,
    };

    return {
      tokenContext,
      evaluationContext,
      previousResults,
      dryRun: options.dryRun,
    };
  }

  private async executeWithLimits(
    actions: AutomationAction[],
    context: ActionExecutionContext,
    maxActions: number
  ): Promise<AutomationActionResult[]> {
    const limitedActions = actions.slice(0, maxActions);

    if (limitedActions.length < actions.length) {
      console.warn(`Actions limited to ${maxActions} (had ${actions.length})`);
    }

    return executeActions(limitedActions, context);
  }

  private getTableName(entityType: string): string {
    switch (entityType) {
      case 'asset':
        return 'assets';
      case 'issue':
        return 'issues';
      case 'data_product':
        return 'data_products';
      case 'quality_rule':
        return 'quality_rules';
      default:
        return 'assets';
    }
  }

  private estimateDuration(actions: AutomationAction[], recordCount: number): string {
    let estimatedMs = 0;

    for (const action of actions) {
      switch (action.type) {
        case 'delay':
          const delayAction = action as { duration: number; unit: string };
          const multiplier = delayAction.unit === 'hours' ? 3600000 :
            delayAction.unit === 'minutes' ? 60000 : 1000;
          estimatedMs += delayAction.duration * multiplier;
          break;
        case 'generate_with_ai':
          estimatedMs += 3000; // ~3s per AI call
          break;
        case 'run_agent':
          estimatedMs += 30000; // ~30s per agent run
          break;
        case 'execute_webhook':
          estimatedMs += 2000; // ~2s per webhook
          break;
        default:
          estimatedMs += 500; // ~0.5s for simple actions
      }
    }

    // Multiply by record count
    estimatedMs *= Math.max(1, recordCount);

    // Format duration
    if (estimatedMs < 1000) {
      return '< 1 second';
    } else if (estimatedMs < 60000) {
      return `~${Math.ceil(estimatedMs / 1000)} seconds`;
    } else {
      return `~${Math.ceil(estimatedMs / 60000)} minutes`;
    }
  }
}

// Singleton instance
let engineInstance: AutomationEngine | null = null;

export function getAutomationEngine(): AutomationEngine {
  if (!engineInstance) {
    engineInstance = new AutomationEngine();
  }
  return engineInstance;
}
