import Anthropic from '@anthropic-ai/sdk';
import { getAmygdalaClient } from '../supabase/client';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentContext {
  runId?: string;
  targetAssets?: string[];
  triggeredBy?: string;
  parameters?: Record<string, any>;
}

export interface AgentRunResult {
  success: boolean;
  runId: string;
  stats: Record<string, number>;
  issuesCreated: number;
  errors: string[];
  duration: number;
}

export interface DetectedIssue {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issueType: 'anomaly' | 'quality_failure' | 'missing_data' | 'freshness' | 'ownership_missing' | 'missing_reference';
  affectedAssets: string[];
  metadata?: Record<string, any>;
}

export abstract class BaseAgent {
  protected name: string;
  protected description: string;
  protected status: AgentStatus = 'idle';
  protected currentRunId: string | null = null;
  protected anthropic: Anthropic;
  protected supabase = getAmygdalaClient();

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  abstract get systemPrompt(): string;
  abstract run(context?: AgentContext): Promise<AgentRunResult>;

  getName(): string {
    return this.name;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  protected setStatus(status: AgentStatus): void {
    this.status = status;
  }

  // Start a new agent run
  protected async startRun(context?: AgentContext): Promise<string> {
    const { data, error } = await this.supabase
      .from('agent_runs')
      .insert({
        agent_name: this.name,
        status: 'running',
        context: context || {},
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to start run: ${error.message}`);

    this.currentRunId = data.id;
    this.setStatus('running');
    return data.id;
  }

  // Complete an agent run
  protected async completeRun(runId: string, results: Record<string, any>, success: boolean = true): Promise<void> {
    await this.supabase
      .from('agent_runs')
      .update({
        status: success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        results,
      })
      .eq('id', runId);

    this.setStatus(success ? 'completed' : 'failed');
    this.currentRunId = null;
  }

  // Fail an agent run
  protected async failRun(runId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', runId);

    this.setStatus('failed');
    this.currentRunId = null;
  }

  // Log an activity
  protected async log(
    action: string,
    summary: string,
    details?: Record<string, any>,
    assetId?: string
  ): Promise<void> {
    await this.supabase.from('agent_logs').insert({
      agent_name: this.name,
      run_id: this.currentRunId,
      asset_id: assetId,
      action,
      summary,
      details: details || {},
    });
  }

  // Create an issue
  protected async createIssue(issue: DetectedIssue): Promise<string> {
    const { data, error } = await this.supabase
      .from('issues')
      .insert({
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        issue_type: issue.issueType,
        affected_assets: issue.affectedAssets,
        created_by: this.name,
        status: 'open',
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create issue: ${error.message}`);

    // Log the issue creation
    await this.log(
      'issue_created',
      `Created ${issue.severity} severity issue: ${issue.title}`,
      { issueId: data.id, ...issue.metadata }
    );

    return data.id;
  }

  // Use Claude to analyze data
  protected async analyzeWithClaude(prompt: string, data: any): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nData to analyze:\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    return textBlock ? textBlock.text : '';
  }

  // Get recent runs for this agent
  async getRecentRuns(limit: number = 10): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_runs')
      .select('*')
      .eq('agent_name', this.name)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get runs: ${error.message}`);
    return data || [];
  }

  // Get recent logs for this agent
  async getRecentLogs(limit: number = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', this.name)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get logs: ${error.message}`);
    return data || [];
  }
}
