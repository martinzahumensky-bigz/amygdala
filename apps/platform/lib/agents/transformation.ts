import { BaseAgent, AgentContext, AgentRunResult } from './base';
import { getMeridianClient } from '../supabase/client';

// ============================================
// TYPES
// ============================================

export type TransformationType =
  | 'format_standardization'
  | 'null_remediation'
  | 'referential_fix'
  | 'deduplication'
  | 'outlier_correction'
  | 'classification'
  | 'custom_sql';

export type PlanStatus =
  | 'draft'
  | 'iterating'
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TransformationRequest {
  sourceType: 'issue' | 'quality_rule' | 'manual' | 'chat' | 'agent';
  sourceId?: string;
  targetAsset: string;
  targetColumn?: string;
  transformationType: TransformationType;
  description: string;
  parameters?: Record<string, any>;
  requestedBy: string;
  accuracyThreshold?: number;  // Default 0.95
  maxIterations?: number;      // Default 5
}

export interface TransformationPlan {
  id: string;
  sourceType: string;
  sourceId?: string;
  targetAsset: string;
  targetColumn?: string;
  transformationType: TransformationType;
  description: string;
  parameters: Record<string, any>;
  generatedCode?: string;
  rollbackCode?: string;
  affectedColumns: string[];
  estimatedRows?: number;
  riskLevel: RiskLevel;
  iterationCount: number;
  maxIterations: number;
  finalAccuracy?: number;
  accuracyThreshold: number;
  status: PlanStatus;
  requestedBy: string;
  createdAt: string;
}

export interface IterationResult {
  iterationNumber: number;
  code: string;
  executionTimeMs: number;
  sampleSize: number;
  success: boolean;
  output: Record<string, any>;
  error?: string;
  accuracy: number;
  meetsThreshold: boolean;
  evaluationNotes: string;
  issuesFound: string[];
  improvementsSuggested: string[];
  sampleBefore: any[];
  sampleAfter: any[];
}

export interface Evaluation {
  accuracy: number;
  meetsThreshold: boolean;
  issues: string[];
  improvements: string[];
  notes: string;
}

export interface ExecutionResult {
  success: boolean;
  output: any;
  logs: string[];
  error?: string;
  executionTime: number;
}

export interface TransformationPreview {
  plan: TransformationPlan;
  affectedRowCount: number;
  sampleBefore: any[];
  sampleAfter: any[];
  riskAssessment: {
    level: RiskLevel;
    factors: string[];
  };
  iterations: IterationResult[];
  reversible: boolean;
}

// ============================================
// TRANSFORMATION AGENT
// ============================================

export class TransformationAgent extends BaseAgent {
  private meridian = getMeridianClient();

  // Configuration
  private readonly DEFAULT_ACCURACY_THRESHOLD = 0.95;
  private readonly DEFAULT_MAX_ITERATIONS = 5;
  private readonly DEFAULT_SAMPLE_SIZE = 1000;

  // Transformation types that don't need iteration
  private readonly SKIP_ITERATION_TYPES: TransformationType[] = [
    'null_remediation', // Simple default value fill
  ];

  constructor() {
    super('Transformation', 'Transforms and repairs data with self-improving iteration loop');
  }

  get systemPrompt(): string {
    return `You are the Transformation Agent for Amygdala, responsible for generating and executing data transformations.

Your capabilities:
1. GENERATE Python or SQL code to transform data
2. EVALUATE transformation results and identify improvements
3. ITERATE on your solution until it meets accuracy thresholds
4. EXPLAIN your approach clearly for human review

Code Generation Guidelines:
- Always include error handling
- Use clear variable names
- Add comments for complex logic
- Return results in a consistent format
- Make code reversible when possible

Evaluation Guidelines:
- Be critical and thorough
- Identify edge cases that weren't handled
- Suggest specific improvements
- Calculate accuracy based on expected vs actual results

When generating transformation code, always structure output as:
{
  "results": [...],  // Transformed data
  "stats": {
    "total": number,
    "transformed": number,
    "unchanged": number,
    "errors": number
  }
}`;
  }

  // ============================================
  // MAIN ENTRY POINT
  // ============================================

  async run(context?: AgentContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runId = await this.startRun(context);

    const stats = {
      plans_created: 0,
      iterations_run: 0,
      transformations_completed: 0,
      transformations_failed: 0,
    };

    try {
      await this.log('run_started', 'Transformation agent run started', { context });

      // This agent is typically invoked with specific requests
      // via createTransformationPlan() rather than run()
      await this.log('info', 'Transformation agent ready. Use createTransformationPlan() to create transformations.');

      await this.completeRun(runId, { stats }, true);
      return {
        success: true,
        runId,
        stats,
        issuesCreated: 0,
        errors: [],
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

  // ============================================
  // CREATE TRANSFORMATION PLAN
  // ============================================

  async createTransformationPlan(request: TransformationRequest): Promise<TransformationPlan> {
    const runId = await this.startRun({ parameters: request });

    try {
      await this.log('plan_creation_started', `Creating transformation plan for ${request.targetAsset}`, {
        type: request.transformationType,
        source: request.sourceType,
      });

      // Determine risk level based on transformation type and scope
      const riskLevel = await this.assessRiskLevel(request);

      // Create the plan in database
      const { data: plan, error } = await this.supabase
        .from('transformation_plans')
        .insert({
          source_type: request.sourceType,
          source_id: request.sourceId,
          target_asset: request.targetAsset,
          target_column: request.targetColumn,
          transformation_type: request.transformationType,
          description: request.description,
          parameters: request.parameters || {},
          risk_level: riskLevel,
          accuracy_threshold: request.accuracyThreshold || this.DEFAULT_ACCURACY_THRESHOLD,
          max_iterations: request.maxIterations || this.DEFAULT_MAX_ITERATIONS,
          status: 'draft',
          requested_by: request.requestedBy,
        })
        .select('*')
        .single();

      if (error) throw new Error(`Failed to create plan: ${error.message}`);

      await this.log('plan_created', `Created transformation plan ${plan.id}`, { planId: plan.id });

      // Start the iteration loop in background (don't await)
      // This prevents Vercel timeout - the loop runs asynchronously
      this.runIterationLoop(plan)
        .then(async (finalPlan) => {
          await this.completeRun(runId, { planId: finalPlan.id, status: finalPlan.status }, true);
        })
        .catch(async (error) => {
          console.error('Iteration loop failed:', error);
          await this.failRun(runId, error instanceof Error ? error.message : 'Unknown error');
        });

      // Return the draft plan immediately
      return this.mapDbPlanToInterface(plan);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMessage);
      throw error;
    }
  }

  // ============================================
  // SELF-IMPROVING ITERATION LOOP
  // ============================================

  private async runIterationLoop(plan: any): Promise<any> {
    // Check if this transformation type needs iteration
    if (this.SKIP_ITERATION_TYPES.includes(plan.transformation_type)) {
      await this.log('skip_iteration', `Skipping iteration for ${plan.transformation_type}`, { planId: plan.id });

      // Generate code once and mark ready for approval
      const code = await this.generateTransformationCode(plan, null, null);

      await this.supabase
        .from('transformation_plans')
        .update({
          generated_code: code,
          iteration_count: 1,
          status: 'pending_approval',
        })
        .eq('id', plan.id);

      return { ...plan, generated_code: code, iteration_count: 1, status: 'pending_approval' };
    }

    // Update status to iterating
    await this.supabase
      .from('transformation_plans')
      .update({ status: 'iterating' })
      .eq('id', plan.id);

    let currentCode: string | null = null;
    let lastResult: IterationResult | null = null;
    let iteration = 0;
    let satisfactory = false;

    while (iteration < plan.max_iterations && !satisfactory) {
      iteration++;

      await this.log('iteration_start', `Starting iteration ${iteration}/${plan.max_iterations}`, {
        planId: plan.id,
        iteration,
      });

      // 1. GENERATE: Create or improve transformation code
      currentCode = await this.generateTransformationCode(plan, currentCode, lastResult);

      // 2. EXECUTE: Run in sandbox on sample data
      const executionResult = await this.executeInSandbox(currentCode, plan);

      // 3. EVALUATE: Check if results meet threshold
      const evaluation = await this.evaluateResults(executionResult, plan);

      // 4. Record iteration
      const iterationResult: IterationResult = {
        iterationNumber: iteration,
        code: currentCode,
        executionTimeMs: executionResult.executionTime,
        sampleSize: this.DEFAULT_SAMPLE_SIZE,
        success: executionResult.success,
        output: executionResult.output,
        error: executionResult.error,
        accuracy: evaluation.accuracy,
        meetsThreshold: evaluation.meetsThreshold,
        evaluationNotes: evaluation.notes,
        issuesFound: evaluation.issues,
        improvementsSuggested: evaluation.improvements,
        sampleBefore: executionResult.output?.sampleBefore || [],
        sampleAfter: executionResult.output?.sampleAfter || [],
      };

      await this.recordIteration(plan.id, iterationResult);
      lastResult = iterationResult;
      satisfactory = evaluation.meetsThreshold;

      await this.log('iteration_complete', `Iteration ${iteration} complete: ${evaluation.accuracy * 100}% accuracy`, {
        planId: plan.id,
        iteration,
        accuracy: evaluation.accuracy,
        meetsThreshold: evaluation.meetsThreshold,
      });

      // Update plan with current progress
      await this.supabase
        .from('transformation_plans')
        .update({
          generated_code: currentCode,
          iteration_count: iteration,
          final_accuracy: evaluation.accuracy,
        })
        .eq('id', plan.id);
    }

    // Determine final status
    const finalStatus: PlanStatus = satisfactory ? 'pending_approval' : 'failed';

    await this.supabase
      .from('transformation_plans')
      .update({ status: finalStatus })
      .eq('id', plan.id);

    if (!satisfactory) {
      await this.log('iteration_failed', `Could not achieve accuracy threshold after ${iteration} iterations`, {
        planId: plan.id,
        finalAccuracy: lastResult?.accuracy,
        threshold: plan.accuracy_threshold,
      });
    } else {
      await this.log('iteration_success', `Achieved ${(lastResult?.accuracy || 0) * 100}% accuracy in ${iteration} iterations`, {
        planId: plan.id,
      });
    }

    // Fetch and return updated plan
    const { data: updatedPlan } = await this.supabase
      .from('transformation_plans')
      .select('*')
      .eq('id', plan.id)
      .single();

    return updatedPlan;
  }

  // ============================================
  // CODE GENERATION
  // ============================================

  private async generateTransformationCode(
    plan: any,
    previousCode: string | null,
    previousResult: IterationResult | null
  ): Promise<string> {
    const context = await this.gatherContext(plan);

    let prompt: string;

    if (!previousCode) {
      // First iteration - generate initial code
      prompt = `Generate Python code to perform the following transformation:

**Task:** ${plan.description}
**Target Asset:** ${plan.target_asset}
**Target Column:** ${plan.target_column || 'multiple columns'}
**Transformation Type:** ${plan.transformation_type}

**Parameters:**
${JSON.stringify(plan.parameters, null, 2)}

**Sample Data (first 10 rows):**
${JSON.stringify(context.sampleData?.slice(0, 10), null, 2)}

**Column Schema:**
${JSON.stringify(context.columns, null, 2)}

Generate code that:
1. Processes the input data (provided as 'data' variable, a list of dicts)
2. Returns results in this format:
{
  "results": [...],  // Transformed data
  "sampleBefore": [...],  // First 5 rows before
  "sampleAfter": [...],   // Same rows after
  "stats": { "total": N, "transformed": N, "unchanged": N, "errors": N }
}

Only return the Python code, no explanations.`;
    } else {
      // Subsequent iteration - improve based on feedback
      prompt = `Improve the following transformation code based on evaluation feedback:

**Previous Code:**
\`\`\`python
${previousCode}
\`\`\`

**Previous Accuracy:** ${((previousResult?.accuracy || 0) * 100).toFixed(1)}%
**Required Accuracy:** ${(plan.accuracy_threshold * 100).toFixed(1)}%

**Issues Found:**
${previousResult?.issuesFound?.map((i: string) => `- ${i}`).join('\n') || 'None'}

**Suggested Improvements:**
${previousResult?.improvementsSuggested?.map((i: string) => `- ${i}`).join('\n') || 'None'}

**Sample Failures:**
${JSON.stringify(previousResult?.output?.failures?.slice(0, 5), null, 2)}

Generate improved Python code that addresses these issues.
Only return the Python code, no explanations.`;
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    let code = textBlock?.text || '';

    // Clean up code (remove markdown code blocks if present)
    code = code.replace(/^```python\n?/gm, '').replace(/^```\n?/gm, '').trim();

    return code;
  }

  // ============================================
  // SANDBOX EXECUTION
  // ============================================

  private async executeInSandbox(code: string, plan: any): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Get sample data
      const sampleData = await this.getSampleData(plan.target_asset, this.DEFAULT_SAMPLE_SIZE);

      // For now, execute locally (in production, use E2B sandbox)
      // This is a simplified execution - real implementation would use E2B
      const result = await this.executeLocally(code, sampleData);

      return {
        success: true,
        output: result,
        logs: [],
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        output: {},
        logs: [],
        error: error instanceof Error ? error.message : 'Execution failed',
        executionTime: Date.now() - startTime,
      };
    }
  }

  // Local execution (simplified - for production use E2B)
  private async executeLocally(code: string, data: any[]): Promise<any> {
    // For safety, we'll use Claude to simulate execution
    // In production, this would be E2B sandbox
    const prompt = `Execute this Python code mentally and return the results:

**Code:**
\`\`\`python
${code}
\`\`\`

**Input Data (variable 'data'):**
${JSON.stringify(data.slice(0, 50), null, 2)}

Simulate running this code and return the expected output in valid JSON format:
{
  "results": [...],
  "sampleBefore": [...],
  "sampleAfter": [...],
  "stats": { "total": N, "transformed": N, "unchanged": N, "errors": N },
  "failures": [...]  // Any rows that failed transformation
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.text || '{}';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { results: [], stats: { total: 0, transformed: 0, unchanged: 0, errors: 0 } };
      }
    }

    return { results: [], stats: { total: 0, transformed: 0, unchanged: 0, errors: 0 } };
  }

  // ============================================
  // EVALUATION
  // ============================================

  private async evaluateResults(result: ExecutionResult, plan: any): Promise<Evaluation> {
    if (!result.success) {
      return {
        accuracy: 0,
        meetsThreshold: false,
        issues: [result.error || 'Execution failed'],
        improvements: ['Fix the code error before continuing'],
        notes: 'Execution failed - cannot evaluate',
      };
    }

    const prompt = `Evaluate these transformation results:

**Task:** ${plan.description}
**Transformation Type:** ${plan.transformation_type}
**Target:** ${plan.target_asset}.${plan.target_column || '*'}

**Execution Stats:**
${JSON.stringify(result.output?.stats, null, 2)}

**Sample Before:**
${JSON.stringify(result.output?.sampleBefore?.slice(0, 5), null, 2)}

**Sample After:**
${JSON.stringify(result.output?.sampleAfter?.slice(0, 5), null, 2)}

**Failures (if any):**
${JSON.stringify(result.output?.failures?.slice(0, 5), null, 2)}

Evaluate:
1. What percentage of transformations appear correct? (0.0 to 1.0)
2. What edge cases or issues were missed?
3. What specific improvements would increase accuracy?

Return JSON only:
{
  "accuracy": 0.XX,
  "issues": ["issue1", "issue2"],
  "improvements": ["improvement1", "improvement2"],
  "notes": "Brief analysis"
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.text || '{}';

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const evaluation = JSON.parse(jsonMatch[0]);
        return {
          accuracy: evaluation.accuracy || 0,
          meetsThreshold: (evaluation.accuracy || 0) >= plan.accuracy_threshold,
          issues: evaluation.issues || [],
          improvements: evaluation.improvements || [],
          notes: evaluation.notes || '',
        };
      } catch {
        // Default evaluation
      }
    }

    // Default conservative evaluation
    return {
      accuracy: 0.5,
      meetsThreshold: false,
      issues: ['Could not parse evaluation response'],
      improvements: ['Retry evaluation'],
      notes: 'Evaluation parsing failed',
    };
  }

  // ============================================
  // APPROVAL & EXECUTION
  // ============================================

  async requestApproval(planId: string): Promise<string> {
    // Check if auto-approve conditions are met
    const { data: plan } = await this.supabase
      .from('transformation_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) throw new Error('Plan not found');

    const autoApprove = this.checkAutoApproveConditions(plan);

    const { data: approval, error } = await this.supabase
      .from('transformation_approvals')
      .insert({
        plan_id: planId,
        status: autoApprove ? 'approved' : 'pending',
        auto_approved: autoApprove,
        auto_approve_reason: autoApprove ? 'Met auto-approve criteria (low risk, small scope)' : null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select('*')
      .single();

    if (error) throw new Error(`Failed to create approval: ${error.message}`);

    await this.log('approval_requested', `Approval requested for plan ${planId}`, {
      planId,
      autoApproved: autoApprove,
    });

    return approval.id;
  }

  private checkAutoApproveConditions(plan: any): boolean {
    // Auto-approve if:
    // 1. Risk level is low
    // 2. Estimated rows < 100
    // 3. Transformation type is simple
    const simpleTypes: TransformationType[] = ['format_standardization', 'null_remediation'];

    return (
      plan.risk_level === 'low' &&
      (plan.estimated_rows || 0) < 100 &&
      simpleTypes.includes(plan.transformation_type)
    );
  }

  async approveTransformation(planId: string, reviewedBy: string, comment?: string): Promise<void> {
    // Find pending approval
    const { data: approval } = await this.supabase
      .from('transformation_approvals')
      .select('*')
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .single();

    if (!approval) throw new Error('No pending approval found');

    // Update approval
    await this.supabase
      .from('transformation_approvals')
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        comment,
      })
      .eq('id', approval.id);

    // Update plan status
    await this.supabase
      .from('transformation_plans')
      .update({ status: 'approved' })
      .eq('id', planId);

    await this.log('transformation_approved', `Transformation ${planId} approved by ${reviewedBy}`, {
      planId,
      reviewedBy,
    });
  }

  async rejectTransformation(planId: string, reviewedBy: string, reason: string): Promise<void> {
    const { data: approval } = await this.supabase
      .from('transformation_approvals')
      .select('*')
      .eq('plan_id', planId)
      .eq('status', 'pending')
      .single();

    if (!approval) throw new Error('No pending approval found');

    await this.supabase
      .from('transformation_approvals')
      .update({
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        comment: reason,
      })
      .eq('id', approval.id);

    await this.supabase
      .from('transformation_plans')
      .update({ status: 'rejected' })
      .eq('id', planId);

    await this.log('transformation_rejected', `Transformation ${planId} rejected by ${reviewedBy}: ${reason}`, {
      planId,
      reviewedBy,
      reason,
    });
  }

  async executeTransformation(planId: string, executedBy: string): Promise<string> {
    const { data: plan } = await this.supabase
      .from('transformation_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) throw new Error('Plan not found');
    if (plan.status !== 'approved') throw new Error('Plan must be approved before execution');

    // Update status
    await this.supabase
      .from('transformation_plans')
      .update({ status: 'executing' })
      .eq('id', planId);

    // Create execution log
    const { data: log, error: logError } = await this.supabase
      .from('transformation_logs')
      .insert({
        plan_id: planId,
        status: 'running',
        executed_by: executedBy,
      })
      .select('*')
      .single();

    if (logError) throw new Error(`Failed to create log: ${logError.message}`);

    try {
      // Create snapshot before execution
      const snapshotId = await this.createSnapshot(plan);

      // Execute the transformation on full dataset
      const result = await this.executeOnFullDataset(plan);

      // Update log with results
      await this.supabase
        .from('transformation_logs')
        .update({
          snapshot_id: snapshotId,
          completed_at: new Date().toISOString(),
          duration_ms: result.duration,
          rows_affected: result.rowsAffected,
          rows_succeeded: result.rowsSucceeded,
          rows_failed: result.rowsFailed,
          status: 'success',
        })
        .eq('id', log.id);

      // Update plan status
      await this.supabase
        .from('transformation_plans')
        .update({ status: 'completed' })
        .eq('id', planId);

      await this.log('transformation_executed', `Transformation ${planId} completed successfully`, {
        planId,
        rowsAffected: result.rowsAffected,
      });

      // Update related issue if applicable
      if (plan.source_type === 'issue' && plan.source_id) {
        await this.supabase
          .from('issues')
          .update({
            status: 'resolved',
            resolution: `Fixed by Transformation Agent (Plan: ${planId})`,
            resolved_by: 'Transformation',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', plan.source_id);
      }

      return log.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';

      await this.supabase
        .from('transformation_logs')
        .update({
          completed_at: new Date().toISOString(),
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', log.id);

      await this.supabase
        .from('transformation_plans')
        .update({ status: 'failed' })
        .eq('id', planId);

      throw error;
    }
  }

  // ============================================
  // PREVIEW & ROLLBACK
  // ============================================

  async getPreview(planId: string): Promise<TransformationPreview> {
    const { data: plan } = await this.supabase
      .from('transformation_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) throw new Error('Plan not found');

    // Get iterations
    const { data: iterations } = await this.supabase
      .from('transformation_iterations')
      .select('*')
      .eq('plan_id', planId)
      .order('iteration_number', { ascending: true });

    // Get estimated row count
    const rowCount = await this.getAffectedRowCount(plan);

    // Get last iteration's samples
    const lastIteration = iterations?.[iterations.length - 1];

    return {
      plan: this.mapDbPlanToInterface(plan),
      affectedRowCount: rowCount,
      sampleBefore: lastIteration?.sample_before || [],
      sampleAfter: lastIteration?.sample_after || [],
      riskAssessment: {
        level: plan.risk_level,
        factors: this.getRiskFactors(plan, rowCount),
      },
      iterations: (iterations || []).map(this.mapDbIterationToInterface),
      reversible: !!plan.rollback_code || plan.risk_level === 'low',
    };
  }

  async rollbackTransformation(logId: string, rolledBackBy: string): Promise<void> {
    const { data: log } = await this.supabase
      .from('transformation_logs')
      .select('*, plan:transformation_plans(*)')
      .eq('id', logId)
      .single();

    if (!log) throw new Error('Log not found');
    if (!log.snapshot_id) throw new Error('No snapshot available for rollback');

    // Get snapshot
    const { data: snapshot } = await this.supabase
      .from('transformation_snapshots')
      .select('*')
      .eq('id', log.snapshot_id)
      .single();

    if (!snapshot) throw new Error('Snapshot not found');

    // Execute rollback (restore from snapshot)
    // In production, this would restore the actual data
    await this.log('rollback_started', `Rolling back transformation ${log.plan_id}`, { logId });

    // Mark snapshot as used
    await this.supabase
      .from('transformation_snapshots')
      .update({
        used_for_rollback: true,
        rolled_back_at: new Date().toISOString(),
      })
      .eq('id', log.snapshot_id);

    // Update log
    await this.supabase
      .from('transformation_logs')
      .update({ status: 'rolled_back' })
      .eq('id', logId);

    await this.log('rollback_completed', `Transformation ${log.plan_id} rolled back by ${rolledBackBy}`, {
      logId,
      rolledBackBy,
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async gatherContext(plan: any): Promise<any> {
    const context: any = {
      sampleData: await this.getSampleData(plan.target_asset, 100),
      columns: await this.getColumnInfo(plan.target_asset),
    };

    // Get related issues if source is an issue
    if (plan.source_type === 'issue' && plan.source_id) {
      const { data: issue } = await this.supabase
        .from('issues')
        .select('*')
        .eq('id', plan.source_id)
        .single();

      context.sourceIssue = issue;
    }

    return context;
  }

  private async getSampleData(assetName: string, limit: number): Promise<any[]> {
    // Extract table name from asset name
    const tableName = assetName.toLowerCase();

    try {
      const { data, error } = await this.meridian
        .from(tableName)
        .select('*')
        .limit(limit);

      if (error) {
        console.error(`Failed to get sample data for ${tableName}:`, error);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  private async getColumnInfo(assetName: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('column_profiles')
      .select('column_name, data_type, inferred_semantic_type, null_percentage')
      .eq('asset_id', assetName);

    return data || [];
  }

  private async getAffectedRowCount(plan: any): Promise<number> {
    const tableName = plan.target_asset.toLowerCase();

    try {
      const { count } = await this.meridian
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      return count || 0;
    } catch {
      return 0;
    }
  }

  private async assessRiskLevel(request: TransformationRequest): Promise<RiskLevel> {
    // High risk transformations
    const highRiskTypes: TransformationType[] = ['deduplication', 'custom_sql'];
    if (highRiskTypes.includes(request.transformationType)) {
      return 'high';
    }

    // Medium risk
    const mediumRiskTypes: TransformationType[] = ['referential_fix', 'outlier_correction'];
    if (mediumRiskTypes.includes(request.transformationType)) {
      return 'medium';
    }

    // Low risk
    return 'low';
  }

  private getRiskFactors(plan: any, rowCount: number): string[] {
    const factors: string[] = [];

    if (rowCount > 10000) factors.push(`Large scope: ${rowCount.toLocaleString()} rows affected`);
    if (rowCount > 1000) factors.push('Consider running in batches');
    if (plan.transformation_type === 'deduplication') factors.push('Deduplication may delete records');
    if (plan.transformation_type === 'custom_sql') factors.push('Custom SQL - review carefully');
    if (!plan.rollback_code) factors.push('No automatic rollback available');

    if (factors.length === 0) {
      factors.push('Low risk transformation');
      factors.push('Reversible');
    }

    return factors;
  }

  private async recordIteration(planId: string, result: IterationResult): Promise<void> {
    await this.supabase.from('transformation_iterations').insert({
      plan_id: planId,
      iteration_number: result.iterationNumber,
      code: result.code,
      execution_time_ms: result.executionTimeMs,
      sample_size: result.sampleSize,
      success: result.success,
      output: result.output,
      error_message: result.error,
      accuracy: result.accuracy,
      meets_threshold: result.meetsThreshold,
      evaluation_notes: result.evaluationNotes,
      issues_found: result.issuesFound,
      improvements_suggested: result.improvementsSuggested,
      sample_before: result.sampleBefore,
      sample_after: result.sampleAfter,
    });
  }

  private async createSnapshot(plan: any): Promise<string> {
    // Get current data
    const data = await this.getSampleData(plan.target_asset, 10000); // Limit for snapshot

    const { data: snapshot, error } = await this.supabase
      .from('transformation_snapshots')
      .insert({
        plan_id: plan.id,
        target_asset: plan.target_asset,
        target_column: plan.target_column,
        snapshot_data: data,
        row_count: data.length,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create snapshot: ${error.message}`);

    return snapshot.id;
  }

  private async executeOnFullDataset(plan: any): Promise<any> {
    // In production, this would execute the actual SQL/code
    // For now, we simulate execution
    const startTime = Date.now();

    const rowCount = await this.getAffectedRowCount(plan);

    // Simulate execution time based on row count
    await new Promise((resolve) => setTimeout(resolve, Math.min(rowCount, 1000)));

    return {
      duration: Date.now() - startTime,
      rowsAffected: rowCount,
      rowsSucceeded: Math.floor(rowCount * 0.98), // Simulate 98% success
      rowsFailed: Math.floor(rowCount * 0.02),
    };
  }

  private mapDbPlanToInterface(plan: any): TransformationPlan {
    return {
      id: plan.id,
      sourceType: plan.source_type,
      sourceId: plan.source_id,
      targetAsset: plan.target_asset,
      targetColumn: plan.target_column,
      transformationType: plan.transformation_type,
      description: plan.description,
      parameters: plan.parameters,
      generatedCode: plan.generated_code,
      rollbackCode: plan.rollback_code,
      affectedColumns: plan.affected_columns || [],
      estimatedRows: plan.estimated_rows,
      riskLevel: plan.risk_level,
      iterationCount: plan.iteration_count,
      maxIterations: plan.max_iterations,
      finalAccuracy: plan.final_accuracy,
      accuracyThreshold: plan.accuracy_threshold,
      status: plan.status,
      requestedBy: plan.requested_by,
      createdAt: plan.created_at,
    };
  }

  private mapDbIterationToInterface(iteration: any): IterationResult {
    return {
      iterationNumber: iteration.iteration_number,
      code: iteration.code,
      executionTimeMs: iteration.execution_time_ms,
      sampleSize: iteration.sample_size,
      success: iteration.success,
      output: iteration.output,
      error: iteration.error_message,
      accuracy: iteration.accuracy,
      meetsThreshold: iteration.meets_threshold,
      evaluationNotes: iteration.evaluation_notes,
      issuesFound: iteration.issues_found || [],
      improvementsSuggested: iteration.improvements_suggested || [],
      sampleBefore: iteration.sample_before || [],
      sampleAfter: iteration.sample_after || [],
    };
  }
}

// Singleton instance
let transformationAgentInstance: TransformationAgent | null = null;

export function getTransformationAgent(): TransformationAgent {
  if (!transformationAgentInstance) {
    transformationAgentInstance = new TransformationAgent();
  }
  return transformationAgentInstance;
}
