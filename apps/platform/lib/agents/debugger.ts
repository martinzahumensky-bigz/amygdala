import { BaseAgent, AgentContext, AgentRunResult } from './base';
import { getMeridianClient, getAmygdalaClient } from '../supabase/client';

interface DebuggerResult {
  issueId: string;
  rootCause: string;
  confidence: 'high' | 'medium' | 'low';
  affectedUpstream: string[];
  proposedSolution: {
    steps: SolutionStep[];
    estimatedEffort: string;
    canAutoFix: boolean;
  };
  recommendation: string;
}

interface SolutionStep {
  order: number;
  action: string;
  description: string;
  automated: boolean;
}

interface AnalysisContext {
  issue: any;
  relatedAssets: any[];
  dataProfile: any;
  lineage: { upstream: string[]; downstream: string[] };
}

export class DebuggerAgent extends BaseAgent {
  private meridianClient = getMeridianClient();
  private amygdalaClient = getAmygdalaClient();

  constructor() {
    super('debugger', 'Investigates issues and finds root causes');
  }

  get systemPrompt(): string {
    return `You are the Debugger agent for the Amygdala data trust platform. Your role is to:

1. Analyze data quality issues to find root causes
2. Trace data lineage to understand impact
3. Propose specific, actionable solutions
4. Estimate effort and determine if fixes can be automated

When analyzing issues, consider:
- The check type and threshold that triggered the issue
- Upstream data sources that might be the root cause
- Data patterns and anomalies
- Business context and impact

Always respond with a JSON object containing:
{
  "rootCause": "Clear explanation of what caused the issue",
  "confidence": "high|medium|low",
  "affectedUpstream": ["list", "of", "upstream", "sources"],
  "proposedSolution": {
    "steps": [
      {"order": 1, "action": "Action name", "description": "Detailed description", "automated": true|false}
    ],
    "estimatedEffort": "low|medium|high",
    "canAutoFix": true|false
  },
  "recommendation": "Overall recommendation"
}`;
  }

  async run(context?: AgentContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let issuesAnalyzed = 0;
    const stats: Record<string, number> = {
      issuesAnalyzed: 0,
      solutionsProposed: 0,
      autoFixable: 0,
    };

    const runId = await this.startRun(context);

    try {
      await this.log('run_started', 'Debugger agent started');

      // Determine what to analyze
      const issueId = context?.parameters?.issueId;

      if (issueId) {
        // Analyze a specific issue
        await this.log('analyzing_issue', `Analyzing issue ${issueId}`);
        const result = await this.analyzeIssue(issueId);

        if (result) {
          stats.issuesAnalyzed++;
          stats.solutionsProposed++;
          if (result.proposedSolution.canAutoFix) stats.autoFixable++;

          // Update the issue with the analysis
          await this.updateIssueWithAnalysis(issueId, result);
        }
      } else {
        // Analyze all open issues
        const { data: openIssues } = await this.amygdalaClient
          .from('issues')
          .select('id')
          .in('status', ['open', 'investigating'])
          .limit(10);

        for (const issue of openIssues || []) {
          try {
            await this.log('analyzing_issue', `Analyzing issue ${issue.id}`);
            const result = await this.analyzeIssue(issue.id);

            if (result) {
              stats.issuesAnalyzed++;
              stats.solutionsProposed++;
              if (result.proposedSolution.canAutoFix) stats.autoFixable++;

              await this.updateIssueWithAnalysis(issue.id, result);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to analyze issue ${issue.id}: ${errorMsg}`);
          }
        }
      }

      await this.log(
        'run_completed',
        `Debugger completed: analyzed ${stats.issuesAnalyzed} issues, proposed ${stats.solutionsProposed} solutions`,
        stats
      );

      await this.completeRun(runId, { stats });

      return {
        success: true,
        runId,
        stats,
        issuesCreated: 0,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMsg);

      return {
        success: false,
        runId,
        stats,
        issuesCreated: 0,
        errors: [...errors, errorMsg],
        duration: Date.now() - startTime,
      };
    }
  }

  async analyzeIssue(issueId: string): Promise<DebuggerResult | null> {
    // Fetch the issue
    const { data: issue, error } = await this.amygdalaClient
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (error || !issue) {
      throw new Error(`Issue not found: ${issueId}`);
    }

    // Gather context for analysis
    const analysisContext = await this.gatherAnalysisContext(issue);

    // Use Claude to analyze and propose solution
    const analysis = await this.performAnalysis(issue, analysisContext);

    return {
      issueId,
      ...analysis,
    };
  }

  private async gatherAnalysisContext(issue: any): Promise<AnalysisContext> {
    const context: AnalysisContext = {
      issue,
      relatedAssets: [],
      dataProfile: null,
      lineage: { upstream: [], downstream: [] },
    };

    // Get affected assets
    if (issue.affected_assets?.length > 0) {
      const { data: assets } = await this.amygdalaClient
        .from('assets')
        .select('*')
        .in('name', issue.affected_assets);

      context.relatedAssets = assets || [];

      // Get lineage from assets
      for (const asset of context.relatedAssets) {
        if (asset.upstream_assets) {
          context.lineage.upstream.push(...asset.upstream_assets);
        }
        if (asset.downstream_assets) {
          context.lineage.downstream.push(...asset.downstream_assets);
        }
      }
    }

    // Get data profile if we have table info
    const tableName = issue.metadata?.table || issue.affected_assets?.[0];
    if (tableName) {
      const cleanTable = tableName.split('.').pop() || tableName;
      try {
        const { count } = await this.meridianClient
          .from(cleanTable)
          .select('*', { count: 'exact', head: true });

        context.dataProfile = {
          tableName: cleanTable,
          rowCount: count,
        };
      } catch {
        // Table might not exist or be accessible
      }
    }

    return context;
  }

  private async performAnalysis(
    issue: any,
    context: AnalysisContext
  ): Promise<Omit<DebuggerResult, 'issueId'>> {
    try {
      const analysisPrompt = `Analyze this data quality issue and provide a root cause analysis with solution:

Issue:
- Title: ${issue.title}
- Type: ${issue.issue_type}
- Severity: ${issue.severity}
- Description: ${issue.description}
- Affected Assets: ${issue.affected_assets?.join(', ')}

Issue Metadata:
${JSON.stringify(issue.metadata || {}, null, 2)}

Data Context:
- Related Assets: ${context.relatedAssets.map((a) => a.name).join(', ')}
- Upstream Sources: ${context.lineage.upstream.join(', ') || 'None identified'}
- Downstream Consumers: ${context.lineage.downstream.join(', ') || 'None identified'}
- Data Profile: ${context.dataProfile ? `${context.dataProfile.rowCount} rows in ${context.dataProfile.tableName}` : 'Not available'}

Provide a detailed root cause analysis and proposed solution.`;

      const response = await this.analyzeWithClaude(analysisPrompt, {
        issue: {
          type: issue.issue_type,
          severity: issue.severity,
          metadata: issue.metadata,
        },
        context: {
          assetCount: context.relatedAssets.length,
          hasUpstream: context.lineage.upstream.length > 0,
          hasDownstream: context.lineage.downstream.length > 0,
        },
      });

      // Try to parse Claude's response as JSON
      try {
        const parsed = JSON.parse(response);
        return {
          rootCause: parsed.rootCause || 'Unable to determine root cause',
          confidence: parsed.confidence || 'medium',
          affectedUpstream: parsed.affectedUpstream || context.lineage.upstream,
          proposedSolution: parsed.proposedSolution || this.generateDefaultSolution(issue),
          recommendation: parsed.recommendation || 'Review the issue manually',
        };
      } catch {
        // If not JSON, use the response as the root cause
        return {
          rootCause: response.slice(0, 500),
          confidence: 'medium',
          affectedUpstream: context.lineage.upstream,
          proposedSolution: this.generateDefaultSolution(issue),
          recommendation: 'Review the detailed analysis above',
        };
      }
    } catch (error) {
      // If Claude analysis fails, generate a rule-based analysis
      return this.generateRuleBasedAnalysis(issue, context);
    }
  }

  private generateDefaultSolution(issue: any): DebuggerResult['proposedSolution'] {
    const steps: SolutionStep[] = [];
    const checkType = issue.metadata?.checkType || issue.issue_type;

    switch (checkType) {
      case 'null_rate':
        steps.push(
          { order: 1, action: 'Identify source', description: 'Check upstream data pipelines for missing data', automated: false },
          { order: 2, action: 'Add validation', description: 'Add NOT NULL constraint or default value', automated: true },
          { order: 3, action: 'Backfill', description: 'Backfill missing values if possible', automated: true }
        );
        break;
      case 'invalid_reference':
        steps.push(
          { order: 1, action: 'Sync references', description: 'Ensure reference data is up-to-date', automated: true },
          { order: 2, action: 'Fix invalid records', description: 'Update records with valid references', automated: true },
          { order: 3, action: 'Add constraint', description: 'Add foreign key constraint to prevent future issues', automated: false }
        );
        break;
      case 'freshness':
        steps.push(
          { order: 1, action: 'Check pipelines', description: 'Verify pipeline execution status', automated: false },
          { order: 2, action: 'Trigger refresh', description: 'Manually trigger data refresh', automated: true },
          { order: 3, action: 'Add monitoring', description: 'Set up freshness alerts', automated: false }
        );
        break;
      case 'outlier':
        steps.push(
          { order: 1, action: 'Investigate outliers', description: 'Review individual outlier records', automated: false },
          { order: 2, action: 'Validate business rules', description: 'Confirm acceptable value ranges', automated: false },
          { order: 3, action: 'Clean data', description: 'Remove or correct invalid outliers', automated: true }
        );
        break;
      default:
        steps.push(
          { order: 1, action: 'Manual review', description: 'Review the issue details manually', automated: false },
          { order: 2, action: 'Consult stakeholders', description: 'Discuss with data owners', automated: false }
        );
    }

    return {
      steps,
      estimatedEffort: steps.length > 2 ? 'medium' : 'low',
      canAutoFix: steps.some((s) => s.automated),
    };
  }

  private generateRuleBasedAnalysis(
    issue: any,
    context: AnalysisContext
  ): Omit<DebuggerResult, 'issueId'> {
    const checkType = issue.metadata?.checkType || issue.issue_type;
    let rootCause = 'Unable to determine root cause automatically';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let recommendation = 'Manual investigation required';

    switch (checkType) {
      case 'null_rate':
        rootCause = `Data ingestion may be failing to capture ${issue.metadata?.column || 'the affected column'}. This often occurs when source systems don't enforce data entry or when ETL processes encounter errors.`;
        confidence = 'medium';
        recommendation = 'Check source system data entry requirements and ETL pipeline logs for errors.';
        break;
      case 'invalid_reference':
        rootCause = `Reference data may be out of sync with transactional data. New ${issue.metadata?.column || 'reference values'} may have been added in source systems without updating reference tables.`;
        confidence = 'high';
        recommendation = 'Synchronize reference data and add foreign key constraints to prevent future issues.';
        break;
      case 'freshness':
        rootCause = 'Data pipeline may have failed or been delayed. Common causes include network issues, source system downtime, or resource constraints.';
        confidence = 'medium';
        recommendation = 'Check pipeline execution logs and source system availability.';
        break;
      case 'outlier':
        rootCause = `Unusual values detected in ${issue.metadata?.column || 'numeric column'}. This could be due to data entry errors, system glitches, or legitimate but extreme business events.`;
        confidence = 'low';
        recommendation = 'Review individual outlier records to determine if they are data errors or valid exceptions.';
        break;
    }

    return {
      rootCause,
      confidence,
      affectedUpstream: context.lineage.upstream,
      proposedSolution: this.generateDefaultSolution(issue),
      recommendation,
    };
  }

  private async updateIssueWithAnalysis(issueId: string, result: DebuggerResult): Promise<void> {
    const { error } = await this.amygdalaClient
      .from('issues')
      .update({
        status: 'in_progress',
        metadata: {
          ...(await this.getExistingMetadata(issueId)),
          debuggerAnalysis: {
            rootCause: result.rootCause,
            confidence: result.confidence,
            affectedUpstream: result.affectedUpstream,
            proposedSolution: result.proposedSolution,
            recommendation: result.recommendation,
            analyzedAt: new Date().toISOString(),
            analyzedBy: this.name,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueId);

    if (error) {
      throw new Error(`Failed to update issue: ${error.message}`);
    }

    await this.log('issue_analyzed', `Updated issue ${issueId} with analysis`, {
      rootCause: result.rootCause.slice(0, 100),
      confidence: result.confidence,
      stepsCount: result.proposedSolution.steps.length,
    });
  }

  private async getExistingMetadata(issueId: string): Promise<Record<string, unknown>> {
    const { data } = await this.amygdalaClient
      .from('issues')
      .select('metadata')
      .eq('id', issueId)
      .single();

    return data?.metadata || {};
  }
}

// Singleton instance
let debuggerInstance: DebuggerAgent | null = null;

export function getDebuggerAgent(): DebuggerAgent {
  if (!debuggerInstance) {
    debuggerInstance = new DebuggerAgent();
  }
  return debuggerInstance;
}
