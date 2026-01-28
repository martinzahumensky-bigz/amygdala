import Anthropic from '@anthropic-ai/sdk';
import { getAmygdalaClient, getMeridianClient } from '../supabase/client';
import { getSpotterAgent } from './spotter';
import { getDocumentaristAgent } from './documentarist';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentName?: string;
  metadata?: Record<string, any>;
}

export interface ChatContext {
  messages: ChatMessage[];
  activeAgent?: string;
  sessionId: string;
  entityContext?: {
    type: 'issue' | 'asset' | 'recommendation' | 'general';
    id?: string;
    title?: string;
  };
}

export interface OrchestratorResponse {
  message: string;
  agentUsed?: string;
  action?: {
    type: 'run_agent' | 'show_data' | 'create_issue' | 'none';
    details?: Record<string, any>;
  };
  suggestions?: string[];
  toolResults?: Record<string, any>;
}

// Define tools the Orchestrator can use
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'run_documentarist',
    description: 'Run the Documentarist agent to profile a data asset and generate column statistics, detect sensitive data, and map business terms. Use this when a user asks to profile an asset, generate statistics, or wants to see column information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'The name of the asset to profile (e.g., "gold_loan_summary", "silver_transactions")',
        },
        mode: {
          type: 'string',
          enum: ['single_asset', 'full_scan'],
          description: 'Whether to profile a single asset or scan all assets',
        },
      },
      required: ['asset_name'],
    },
  },
  {
    name: 'run_spotter',
    description: 'Run the Spotter agent to detect anomalies and data quality issues across all data assets. Use this when a user asks to scan for issues, check data quality, or find anomalies.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scope: {
          type: 'string',
          enum: ['all', 'gold', 'silver', 'bronze'],
          description: 'Which data layer to scan for issues',
        },
      },
    },
  },
  {
    name: 'get_asset_details',
    description: 'Get detailed information about a specific data asset including its profile, quality rules, and statistics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'The name of the asset to get details for',
        },
      },
      required: ['asset_name'],
    },
  },
  {
    name: 'get_column_profiles',
    description: 'Get column-level profiling statistics for an asset including null rates, distinct counts, and value distributions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'The name of the asset to get column profiles for',
        },
      },
      required: ['asset_name'],
    },
  },
  {
    name: 'list_open_issues',
    description: 'List all open data quality issues, optionally filtered by asset.',
    input_schema: {
      type: 'object' as const,
      properties: {
        asset_name: {
          type: 'string',
          description: 'Optional: filter issues by asset name',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Optional: filter by severity',
        },
      },
    },
  },
];

const AVAILABLE_AGENTS = {
  spotter: {
    name: 'Spotter',
    description: 'Detects anomalies and data quality issues in your data assets',
    capabilities: ['anomaly detection', 'null rate analysis', 'outlier detection', 'freshness checks'],
  },
  documentarist: {
    name: 'Documentarist',
    description: 'Discovers and documents data assets automatically, profiles columns, detects sensitive data',
    capabilities: ['asset profiling', 'column statistics', 'sensitive data detection', 'business term mapping'],
  },
  quality: {
    name: 'Quality Agent',
    description: 'Generates and enforces data quality rules based on profiling',
    capabilities: ['rule generation', 'validation', 'quality scoring'],
  },
};

export class OrchestratorAgent {
  private supabase = getAmygdalaClient();
  private meridian = getMeridianClient();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set - chat will not work');
    }
  }

  get systemPrompt(): string {
    return `You are the Orchestrator Agent for Amygdala, a data trust platform. Your role is to:

1. Understand user requests about data quality, trust, and management
2. Execute actions using the available tools when the user asks for something
3. Provide helpful information and real results from tool executions

IMPORTANT: When a user asks you to do something (like profile an asset, scan for issues, etc.), you MUST use the appropriate tool to actually perform the action. Do not just describe what you would do - actually do it using the tools.

Available Agents:
${Object.entries(AVAILABLE_AGENTS).map(([id, agent]) =>
  `- ${agent.name}: ${agent.description}`
).join('\n')}

When responding:
- Be concise and action-oriented
- When the user asks to profile an asset, use the run_documentarist tool
- When the user asks to scan for issues, use the run_spotter tool
- When the user asks about an asset, use get_asset_details or get_column_profiles
- Report the actual results from tools, not hypothetical outcomes
- Use markdown formatting for results`;
  }

  async processMessage(
    userMessage: string,
    context: ChatContext
  ): Promise<OrchestratorResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        message: 'The AI service is not configured. Please set the ANTHROPIC_API_KEY environment variable.',
        agentUsed: 'orchestrator',
        action: { type: 'none' },
      };
    }

    try {
      // Build conversation history
      const messages: Anthropic.MessageParam[] = context.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add current message
      messages.push({ role: 'user', content: userMessage });

      // Get additional context
      const dataContext = await this.gatherDataContext();

      // Get entity-specific context if available
      let entityContextInfo = '';
      if (context.entityContext) {
        entityContextInfo = await this.getEntityContextInfo(context.entityContext);
      }

      // Create enriched system prompt
      const enrichedPrompt = `${this.systemPrompt}

Current Platform State:
- Total Assets: ${dataContext.assetCount}
- Open Issues: ${dataContext.openIssues}
- Average Quality: ${dataContext.avgQuality}%
${entityContextInfo}`;

      // Call Claude API with tools
      const apiKey = process.env.ANTHROPIC_API_KEY;

      const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: enrichedPrompt,
          messages,
          tools: TOOLS,
        }),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('Anthropic API error:', fetchResponse.status, errorText);
        throw new Error(`API error ${fetchResponse.status}: ${errorText.slice(0, 100)}`);
      }

      const response = await fetchResponse.json();

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        return await this.handleToolUse(response, messages, enrichedPrompt);
      }

      // Extract text response
      const textBlock = response.content.find((block: any) => block.type === 'text');
      const responseText = textBlock?.text || 'I apologize, I could not process your request.';

      return {
        message: responseText,
        agentUsed: 'orchestrator',
        action: { type: 'none' },
        suggestions: this.generateSuggestions(userMessage, dataContext),
      };
    } catch (error) {
      console.error('Orchestrator error:', error);

      let errorMessage = 'I encountered an error processing your request. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('401')) {
          errorMessage = 'The AI service is not configured properly. Please check the API key.';
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = 'The AI service is busy. Please try again in a moment.';
        }
      }

      return {
        message: errorMessage,
        agentUsed: 'orchestrator',
        action: { type: 'none' },
      };
    }
  }

  private async handleToolUse(
    response: any,
    messages: Anthropic.MessageParam[],
    systemPrompt: string
  ): Promise<OrchestratorResponse> {
    const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
    const toolResults: any[] = [];
    const executedActions: Record<string, any> = {};

    // Execute each tool
    for (const toolBlock of toolUseBlocks) {
      const result = await this.executeTool(toolBlock.name, toolBlock.input);
      executedActions[toolBlock.name] = result;

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    // Send tool results back to Claude for final response
    const updatedMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const finalResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: updatedMessages,
        tools: TOOLS,
      }),
    });

    if (!finalResponse.ok) {
      const errorText = await finalResponse.text();
      throw new Error(`API error: ${errorText}`);
    }

    const finalData = await finalResponse.json();
    const textBlock = finalData.content.find((block: any) => block.type === 'text');
    const responseText = textBlock?.text || 'Action completed successfully.';

    return {
      message: responseText,
      agentUsed: 'orchestrator',
      action: { type: 'run_agent', details: executedActions },
      toolResults: executedActions,
    };
  }

  private async executeTool(toolName: string, input: any): Promise<any> {
    console.log(`Executing tool: ${toolName}`, input);

    switch (toolName) {
      case 'run_documentarist':
        return await this.executeDocumentarist(input);

      case 'run_spotter':
        return await this.executeSpotter(input);

      case 'get_asset_details':
        return await this.getAssetDetails(input.asset_name);

      case 'get_column_profiles':
        return await this.getColumnProfiles(input.asset_name);

      case 'list_open_issues':
        return await this.listOpenIssues(input);

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  private async executeDocumentarist(input: { asset_name: string; mode?: string }): Promise<any> {
    try {
      // Find the asset by name
      const { data: asset } = await this.supabase
        .from('assets')
        .select('id, name, source_table')
        .eq('name', input.asset_name)
        .single();

      if (!asset) {
        // Asset doesn't exist, run discovery for this specific table
        const documentarist = getDocumentaristAgent();
        const result = await documentarist.run({
          parameters: {
            mode: 'single_asset',
            targetTable: input.asset_name,
            targetSchema: 'meridian',
          },
        });

        return {
          success: result.success,
          action: 'profiled_new_asset',
          assetName: input.asset_name,
          stats: result.stats,
          message: `Profiled ${input.asset_name}. Created new asset with ${result.stats?.profilesGenerated || 0} column profiles.`,
        };
      }

      // Asset exists, run profiling on it
      const documentarist = getDocumentaristAgent();
      const result = await documentarist.run({
        parameters: {
          mode: 'single_asset',
          assetId: asset.id,
          targetTable: asset.source_table || input.asset_name,
          targetSchema: 'meridian',
        },
      });

      // Get the updated column profiles
      const { data: profiles } = await this.supabase
        .from('column_profiles')
        .select('*')
        .eq('asset_id', asset.id);

      // Get updated asset metadata
      const { data: updatedAsset } = await this.supabase
        .from('assets')
        .select('*')
        .eq('id', asset.id)
        .single();

      return {
        success: result.success,
        action: 'profiled_existing_asset',
        assetName: input.asset_name,
        assetId: asset.id,
        stats: result.stats,
        columnCount: profiles?.length || 0,
        columns: profiles?.slice(0, 10).map(p => ({
          name: p.column_name,
          type: p.data_type,
          semanticType: p.inferred_semantic_type,
          nullPercentage: p.null_percentage,
          distinctCount: p.distinct_count,
        })),
        metadata: updatedAsset?.metadata,
        message: `Successfully profiled ${input.asset_name}. Found ${profiles?.length || 0} columns.`,
      };
    } catch (error) {
      console.error('Documentarist execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        assetName: input.asset_name,
      };
    }
  }

  private async executeSpotter(input: { scope?: string }): Promise<any> {
    try {
      const spotter = getSpotterAgent();
      const result = await spotter.run({
        parameters: { scope: input.scope || 'all' },
      });

      return {
        success: result.success,
        issuesFound: result.stats?.issuesCreated || 0,
        checksRun: result.stats?.checksRun || 0,
        message: `Spotter scan complete. Found ${result.stats?.issuesCreated || 0} issues.`,
      };
    } catch (error) {
      console.error('Spotter execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getAssetDetails(assetName: string): Promise<any> {
    try {
      const { data: asset } = await this.supabase
        .from('assets')
        .select('*')
        .eq('name', assetName)
        .single();

      if (!asset) {
        return { error: `Asset "${assetName}" not found` };
      }

      // Get open issues
      const { data: issues } = await this.supabase
        .from('issues')
        .select('title, severity, status')
        .contains('affected_assets', [assetName])
        .in('status', ['open', 'investigating', 'in_progress']);

      return {
        name: asset.name,
        type: asset.asset_type,
        layer: asset.layer,
        description: asset.description,
        qualityScore: asset.quality_score,
        trustScore: asset.trust_score_stars,
        fitnessStatus: asset.fitness_status,
        owner: asset.owner,
        steward: asset.steward,
        metadata: asset.metadata,
        openIssues: issues?.length || 0,
        issues: issues?.slice(0, 5),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async getColumnProfiles(assetName: string): Promise<any> {
    try {
      const { data: asset } = await this.supabase
        .from('assets')
        .select('id')
        .eq('name', assetName)
        .single();

      if (!asset) {
        return { error: `Asset "${assetName}" not found`, suggestion: 'Run the Documentarist to profile this asset first.' };
      }

      const { data: profiles } = await this.supabase
        .from('column_profiles')
        .select('*')
        .eq('asset_id', asset.id)
        .order('column_name');

      if (!profiles || profiles.length === 0) {
        return {
          error: 'No column profiles found',
          suggestion: 'Run the Documentarist agent to generate column profiles for this asset.',
          assetName,
        };
      }

      return {
        assetName,
        columnCount: profiles.length,
        columns: profiles.map(p => ({
          name: p.column_name,
          dataType: p.data_type,
          semanticType: p.inferred_semantic_type,
          nullPercentage: p.null_percentage,
          distinctCount: p.distinct_count,
          distinctPercentage: p.distinct_percentage,
          minValue: p.min_value,
          maxValue: p.max_value,
          meanValue: p.mean_value,
          topValues: p.top_values?.slice(0, 3),
        })),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async listOpenIssues(input: { asset_name?: string; severity?: string }): Promise<any> {
    try {
      let query = this.supabase
        .from('issues')
        .select('*')
        .in('status', ['open', 'investigating', 'in_progress'])
        .order('severity')
        .limit(10);

      if (input.severity) {
        query = query.eq('severity', input.severity);
      }

      const { data: issues } = await query;

      let filteredIssues = issues || [];
      if (input.asset_name) {
        filteredIssues = filteredIssues.filter(i =>
          i.affected_assets?.includes(input.asset_name)
        );
      }

      return {
        count: filteredIssues.length,
        issues: filteredIssues.map(i => ({
          id: i.id,
          title: i.title,
          severity: i.severity,
          type: i.issue_type,
          status: i.status,
          affectedAssets: i.affected_assets,
        })),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async gatherDataContext(): Promise<{
    assetCount: number;
    openIssues: number;
    avgQuality: number;
  }> {
    try {
      const { count: assetCount } = await this.supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      const { count: openIssues } = await this.supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating', 'in_progress']);

      const { data: assets } = await this.supabase
        .from('assets')
        .select('quality_score')
        .not('quality_score', 'is', null);

      const avgQuality = assets && assets.length > 0
        ? Math.round(assets.reduce((sum, a) => sum + (a.quality_score || 0), 0) / assets.length)
        : 0;

      return {
        assetCount: assetCount || 0,
        openIssues: openIssues || 0,
        avgQuality,
      };
    } catch (error) {
      console.error('Context gathering error:', error);
      return { assetCount: 0, openIssues: 0, avgQuality: 0 };
    }
  }

  private async getEntityContextInfo(entityContext: NonNullable<ChatContext['entityContext']>): Promise<string> {
    try {
      if (entityContext.type === 'asset' && entityContext.id) {
        const { data: asset } = await this.supabase
          .from('assets')
          .select('*')
          .eq('id', entityContext.id)
          .single();

        if (asset) {
          return `
FOCUSED CONTEXT - Asset:
You are helping the user with a specific data asset:
- Name: ${asset.name}
- Type: ${asset.asset_type}
- Layer: ${asset.layer}
- Quality Score: ${asset.quality_score || 'N/A'}%
- Trust Score: ${asset.trust_score_stars || 0}/5 stars

When the user asks to profile or analyze this asset, use the asset name "${asset.name}" in tool calls.`;
        }
      } else if (entityContext.type === 'issue' && entityContext.id) {
        const { data: issue } = await this.supabase
          .from('issues')
          .select('*')
          .eq('id', entityContext.id)
          .single();

        if (issue) {
          return `
FOCUSED CONTEXT - Issue:
You are helping the user with a specific issue:
- Title: ${issue.title}
- Severity: ${issue.severity}
- Type: ${issue.issue_type}
- Affected Assets: ${issue.affected_assets?.join(', ') || 'None'}`;
        }
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  private generateSuggestions(
    userMessage: string,
    context: { openIssues: number; assetCount: number }
  ): string[] {
    const suggestions: string[] = [];

    if (context.openIssues > 0) {
      suggestions.push('Show me the current issues');
    }

    if (context.assetCount === 0) {
      suggestions.push('Discover and catalog data assets');
    } else {
      suggestions.push('Run a data quality scan');
      suggestions.push('Profile all assets');
    }

    return suggestions.slice(0, 3);
  }
}

// Singleton instance
let orchestratorInstance: OrchestratorAgent | null = null;

export function getOrchestratorAgent(): OrchestratorAgent {
  if (!orchestratorInstance) {
    orchestratorInstance = new OrchestratorAgent();
  }
  return orchestratorInstance;
}
