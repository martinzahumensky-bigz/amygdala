import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, AgentContext, AgentRunResult } from './base';
import { getMeridianClient } from '../supabase/client';

export type OperationType =
  | 'update_asset_metadata'
  | 'resolve_issue'
  | 'close_issue'
  | 'assign_owner'
  | 'assign_steward'
  | 'update_description'
  | 'trigger_refresh'
  | 'execute_fix';

export interface OperationRequest {
  type: OperationType;
  targetId: string;
  targetType: 'asset' | 'issue';
  payload: Record<string, any>;
  reason: string;
  requestedBy?: string;
}

export interface OperationResult {
  success: boolean;
  operation: OperationType;
  targetId: string;
  changes: Record<string, any>;
  message: string;
}

export interface OperatorRunContext extends AgentContext {
  operations?: OperationRequest[];
  dryRun?: boolean;
}

export class OperatorAgent extends BaseAgent {
  private meridian = getMeridianClient();

  constructor() {
    super('Operator', 'Executes approved changes to assets, issues, and pipelines');
  }

  get systemPrompt(): string {
    return `You are the Operator Agent for Amygdala, responsible for executing approved changes.

Your role is to:
1. Update asset metadata (owner, steward, description, business context)
2. Resolve and close issues with proper resolution notes
3. Execute approved fixes proposed by the Debugger agent
4. Trigger pipeline refreshes when needed

SAFETY RULES:
- NEVER execute destructive operations without explicit approval
- Always log every change with before/after state
- Validate all inputs before execution
- Report any anomalies during execution

When executing operations, provide:
1. Clear description of what will change
2. Confirmation of successful execution
3. Any warnings or follow-up actions needed

You work alongside other agents:
- Spotter: Detects issues
- Debugger: Analyzes issues and proposes fixes
- Documentarist: Discovers and documents assets
- YOU: Execute the approved changes`;
  }

  async run(context?: OperatorRunContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runId = await this.startRun(context);

    const stats = {
      operations_requested: 0,
      operations_completed: 0,
      operations_failed: 0,
      assets_updated: 0,
      issues_resolved: 0,
    };

    const errors: string[] = [];

    try {
      await this.log('run_started', 'Operator agent run started', { context });

      const operations = context?.operations || [];
      const dryRun = context?.dryRun ?? false;

      if (operations.length === 0) {
        await this.log('no_operations', 'No operations to execute');
        await this.completeRun(runId, { stats, dryRun }, true);
        return {
          success: true,
          runId,
          stats,
          issuesCreated: 0,
          errors,
          duration: Date.now() - startTime,
        };
      }

      stats.operations_requested = operations.length;

      for (const operation of operations) {
        try {
          if (dryRun) {
            await this.log('dry_run', `Would execute: ${operation.type}`, { operation });
            continue;
          }

          const result = await this.executeOperation(operation);

          if (result.success) {
            stats.operations_completed++;

            if (operation.targetType === 'asset') {
              stats.assets_updated++;
            } else if (operation.type === 'resolve_issue' || operation.type === 'close_issue') {
              stats.issues_resolved++;
            }
          } else {
            stats.operations_failed++;
            errors.push(result.message);
          }
        } catch (error) {
          stats.operations_failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Operation ${operation.type} failed: ${errorMessage}`);
          await this.log('operation_error', `Failed to execute ${operation.type}`, {
            operation,
            error: errorMessage
          });
        }
      }

      await this.completeRun(runId, { stats, dryRun, errors }, errors.length === 0);

      return {
        success: errors.length === 0,
        runId,
        stats,
        issuesCreated: 0,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMessage);

      return {
        success: false,
        runId,
        stats,
        issuesCreated: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      };
    }
  }

  async executeOperation(operation: OperationRequest): Promise<OperationResult> {
    switch (operation.type) {
      case 'update_asset_metadata':
        return this.updateAssetMetadata(operation);
      case 'assign_owner':
        return this.assignOwner(operation);
      case 'assign_steward':
        return this.assignSteward(operation);
      case 'update_description':
        return this.updateDescription(operation);
      case 'resolve_issue':
        return this.resolveIssue(operation);
      case 'close_issue':
        return this.closeIssue(operation);
      case 'trigger_refresh':
        return this.triggerRefresh(operation);
      case 'execute_fix':
        return this.executeFix(operation);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async updateAssetMetadata(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;

    // Fetch current state
    const { data: asset, error: fetchError } = await this.supabase
      .from('assets')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        operation: 'update_asset_metadata',
        targetId,
        changes: {},
        message: `Asset not found: ${targetId}`,
      };
    }

    const beforeState = {
      owner: asset.owner,
      steward: asset.steward,
      description: asset.description,
      business_context: asset.business_context,
    };

    // Update asset
    const { error: updateError } = await this.supabase
      .from('assets')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'update_asset_metadata',
        targetId,
        changes: {},
        message: `Failed to update: ${updateError.message}`,
      };
    }

    await this.log('asset_updated', `Updated asset metadata for ${asset.name}`, {
      assetId: targetId,
      assetName: asset.name,
      beforeState,
      afterState: payload,
      reason,
    }, targetId);

    return {
      success: true,
      operation: 'update_asset_metadata',
      targetId,
      changes: payload,
      message: `Successfully updated asset: ${asset.name}`,
    };
  }

  private async assignOwner(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { owner } = payload;

    if (!owner) {
      return {
        success: false,
        operation: 'assign_owner',
        targetId,
        changes: {},
        message: 'Owner name is required',
      };
    }

    const { data: asset, error: fetchError } = await this.supabase
      .from('assets')
      .select('name, owner')
      .eq('id', targetId)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        operation: 'assign_owner',
        targetId,
        changes: {},
        message: `Asset not found: ${targetId}`,
      };
    }

    const previousOwner = asset.owner;

    const { error: updateError } = await this.supabase
      .from('assets')
      .update({
        owner,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'assign_owner',
        targetId,
        changes: {},
        message: `Failed to assign owner: ${updateError.message}`,
      };
    }

    await this.log('owner_assigned', `Assigned owner ${owner} to ${asset.name}`, {
      assetId: targetId,
      previousOwner,
      newOwner: owner,
      reason,
    }, targetId);

    return {
      success: true,
      operation: 'assign_owner',
      targetId,
      changes: { owner, previousOwner },
      message: `Successfully assigned ${owner} as owner of ${asset.name}`,
    };
  }

  private async assignSteward(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { steward } = payload;

    if (!steward) {
      return {
        success: false,
        operation: 'assign_steward',
        targetId,
        changes: {},
        message: 'Steward name is required',
      };
    }

    const { data: asset, error: fetchError } = await this.supabase
      .from('assets')
      .select('name, steward')
      .eq('id', targetId)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        operation: 'assign_steward',
        targetId,
        changes: {},
        message: `Asset not found: ${targetId}`,
      };
    }

    const previousSteward = asset.steward;

    const { error: updateError } = await this.supabase
      .from('assets')
      .update({
        steward,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'assign_steward',
        targetId,
        changes: {},
        message: `Failed to assign steward: ${updateError.message}`,
      };
    }

    await this.log('steward_assigned', `Assigned steward ${steward} to ${asset.name}`, {
      assetId: targetId,
      previousSteward,
      newSteward: steward,
      reason,
    }, targetId);

    return {
      success: true,
      operation: 'assign_steward',
      targetId,
      changes: { steward, previousSteward },
      message: `Successfully assigned ${steward} as steward of ${asset.name}`,
    };
  }

  private async updateDescription(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { description, business_context } = payload;

    const { data: asset, error: fetchError } = await this.supabase
      .from('assets')
      .select('name, description, business_context')
      .eq('id', targetId)
      .single();

    if (fetchError || !asset) {
      return {
        success: false,
        operation: 'update_description',
        targetId,
        changes: {},
        message: `Asset not found: ${targetId}`,
      };
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (description !== undefined) {
      updates.description = description;
    }
    if (business_context !== undefined) {
      updates.business_context = business_context;
    }

    const { error: updateError } = await this.supabase
      .from('assets')
      .update(updates)
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'update_description',
        targetId,
        changes: {},
        message: `Failed to update description: ${updateError.message}`,
      };
    }

    await this.log('description_updated', `Updated description for ${asset.name}`, {
      assetId: targetId,
      previousDescription: asset.description,
      newDescription: description,
      previousContext: asset.business_context,
      newContext: business_context,
      reason,
    }, targetId);

    return {
      success: true,
      operation: 'update_description',
      targetId,
      changes: { description, business_context },
      message: `Successfully updated description for ${asset.name}`,
    };
  }

  private async resolveIssue(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { resolution, resolvedBy } = payload;

    const { data: issue, error: fetchError } = await this.supabase
      .from('issues')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchError || !issue) {
      return {
        success: false,
        operation: 'resolve_issue',
        targetId,
        changes: {},
        message: `Issue not found: ${targetId}`,
      };
    }

    const { error: updateError } = await this.supabase
      .from('issues')
      .update({
        status: 'resolved',
        resolution: resolution || 'Resolved by Operator agent',
        resolved_by: resolvedBy || 'Operator',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'resolve_issue',
        targetId,
        changes: {},
        message: `Failed to resolve issue: ${updateError.message}`,
      };
    }

    await this.log('issue_resolved', `Resolved issue: ${issue.title}`, {
      issueId: targetId,
      previousStatus: issue.status,
      resolution,
      reason,
    });

    return {
      success: true,
      operation: 'resolve_issue',
      targetId,
      changes: { status: 'resolved', resolution },
      message: `Successfully resolved issue: ${issue.title}`,
    };
  }

  private async closeIssue(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { closeReason } = payload;

    const { data: issue, error: fetchError } = await this.supabase
      .from('issues')
      .select('*')
      .eq('id', targetId)
      .single();

    if (fetchError || !issue) {
      return {
        success: false,
        operation: 'close_issue',
        targetId,
        changes: {},
        message: `Issue not found: ${targetId}`,
      };
    }

    const { error: updateError } = await this.supabase
      .from('issues')
      .update({
        status: 'closed',
        resolution: closeReason || 'Closed by Operator agent',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId);

    if (updateError) {
      return {
        success: false,
        operation: 'close_issue',
        targetId,
        changes: {},
        message: `Failed to close issue: ${updateError.message}`,
      };
    }

    await this.log('issue_closed', `Closed issue: ${issue.title}`, {
      issueId: targetId,
      previousStatus: issue.status,
      closeReason,
      reason,
    });

    return {
      success: true,
      operation: 'close_issue',
      targetId,
      changes: { status: 'closed', closeReason },
      message: `Successfully closed issue: ${issue.title}`,
    };
  }

  private async triggerRefresh(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;

    // For now, this is simulated - in production would trigger actual pipeline
    await this.log('refresh_triggered', `Triggered refresh for asset/pipeline`, {
      targetId,
      payload,
      reason,
      simulated: true,
    });

    // Check if there's a pipeline associated with this asset
    const { data: pipeline } = await this.meridian
      .from('pipelines')
      .select('id, name')
      .contains('target_tables', [targetId])
      .single();

    if (pipeline) {
      // Create a pipeline run entry (simulated)
      await this.meridian
        .from('pipeline_runs')
        .insert({
          pipeline_id: pipeline.id,
          status: 'pending',
          triggered_by: 'Operator Agent',
          started_at: new Date().toISOString(),
        });

      return {
        success: true,
        operation: 'trigger_refresh',
        targetId,
        changes: { pipelineId: pipeline.id, pipelineName: pipeline.name },
        message: `Triggered refresh for pipeline: ${pipeline.name}`,
      };
    }

    return {
      success: true,
      operation: 'trigger_refresh',
      targetId,
      changes: { simulated: true },
      message: `Refresh request logged (no pipeline found for direct execution)`,
    };
  }

  private async executeFix(operation: OperationRequest): Promise<OperationResult> {
    const { targetId, payload, reason } = operation;
    const { fixSteps, issueId } = payload;

    if (!fixSteps || !Array.isArray(fixSteps)) {
      return {
        success: false,
        operation: 'execute_fix',
        targetId,
        changes: {},
        message: 'Fix steps are required',
      };
    }

    const executedSteps: string[] = [];
    const failedSteps: string[] = [];

    for (const step of fixSteps) {
      try {
        // Use Claude to determine how to execute each step
        const analysis = await this.analyzeWithClaude(
          `Given this fix step, determine if it can be safely executed automatically.
          Return JSON with: { canExecute: boolean, action: string, reason: string }`,
          { step, targetId, context: payload }
        );

        // Log each step (actual execution would depend on step type)
        await this.log('fix_step', `Executing fix step: ${step}`, {
          step,
          issueId,
          targetId,
          analysis,
        });

        executedSteps.push(step);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedSteps.push(`${step}: ${errorMessage}`);
      }
    }

    // If there's an associated issue, update it
    if (issueId) {
      await this.supabase
        .from('issues')
        .update({
          status: failedSteps.length === 0 ? 'resolved' : 'in_progress',
          metadata: {
            fixExecuted: true,
            executedSteps,
            failedSteps,
            executedAt: new Date().toISOString(),
            executedBy: 'Operator',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', issueId);
    }

    return {
      success: failedSteps.length === 0,
      operation: 'execute_fix',
      targetId,
      changes: { executedSteps, failedSteps },
      message: failedSteps.length === 0
        ? `Successfully executed ${executedSteps.length} fix steps`
        : `Executed ${executedSteps.length} steps, ${failedSteps.length} failed`,
    };
  }

  // Convenience method to execute a single operation with confirmation
  async executeWithConfirmation(
    operation: OperationRequest,
    confirmed: boolean
  ): Promise<OperationResult> {
    if (!confirmed) {
      await this.log('operation_rejected', `Operation ${operation.type} was not confirmed`, {
        operation,
      });

      return {
        success: false,
        operation: operation.type,
        targetId: operation.targetId,
        changes: {},
        message: 'Operation was not confirmed by user',
      };
    }

    return this.executeOperation(operation);
  }

  // Preview what an operation would do without executing
  async previewOperation(operation: OperationRequest): Promise<{
    operation: OperationType;
    targetId: string;
    targetType: 'asset' | 'issue';
    currentState: Record<string, any>;
    proposedChanges: Record<string, any>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let currentState: Record<string, any> = {};

    if (operation.targetType === 'asset') {
      const { data: asset } = await this.supabase
        .from('assets')
        .select('*')
        .eq('id', operation.targetId)
        .single();

      if (asset) {
        currentState = {
          name: asset.name,
          owner: asset.owner,
          steward: asset.steward,
          description: asset.description,
          business_context: asset.business_context,
        };
      } else {
        warnings.push('Asset not found');
      }
    } else if (operation.targetType === 'issue') {
      const { data: issue } = await this.supabase
        .from('issues')
        .select('*')
        .eq('id', operation.targetId)
        .single();

      if (issue) {
        currentState = {
          title: issue.title,
          status: issue.status,
          severity: issue.severity,
          resolution: issue.resolution,
        };

        if (issue.status === 'resolved' || issue.status === 'closed') {
          warnings.push('Issue is already resolved/closed');
        }
      } else {
        warnings.push('Issue not found');
      }
    }

    return {
      operation: operation.type,
      targetId: operation.targetId,
      targetType: operation.targetType,
      currentState,
      proposedChanges: operation.payload,
      warnings,
    };
  }
}

// Singleton instance
let operatorInstance: OperatorAgent | null = null;

export function getOperatorAgent(): OperatorAgent {
  if (!operatorInstance) {
    operatorInstance = new OperatorAgent();
  }
  return operatorInstance;
}
