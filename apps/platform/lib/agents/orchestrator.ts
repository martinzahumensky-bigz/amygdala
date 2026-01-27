import Anthropic from '@anthropic-ai/sdk';
import { getAmygdalaClient, getMeridianClient } from '../supabase/client';
import { getSpotterAgent } from './spotter';

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
}

const AVAILABLE_AGENTS = {
  spotter: {
    name: 'Spotter',
    description: 'Detects anomalies and data quality issues in your data assets',
    capabilities: ['anomaly detection', 'null rate analysis', 'outlier detection', 'freshness checks', 'reference validation'],
    available: true,
  },
  debugger: {
    name: 'Debugger',
    description: 'Investigates issues and finds root causes',
    capabilities: ['root cause analysis', 'lineage tracing', 'issue investigation'],
    available: true,
  },
  documentarist: {
    name: 'Documentarist',
    description: 'Discovers and documents data assets automatically',
    capabilities: ['asset discovery', 'profiling', 'description generation', 'lineage tracing'],
    available: true,
  },
  operator: {
    name: 'Operator',
    description: 'Executes approved changes to assets, issues, and pipelines',
    capabilities: ['metadata updates', 'issue resolution', 'fix execution', 'pipeline refresh'],
    available: true,
  },
  quality: {
    name: 'Quality Agent',
    description: 'Generates and enforces data quality rules based on profiling',
    capabilities: ['rule generation', 'data profiling', 'validation', 'quality scoring'],
    available: true,
  },
  trust: {
    name: 'Trust Agent',
    description: 'Calculates and monitors trust scores for data assets',
    capabilities: ['trust scoring', 'trend detection', 'fitness assessment', 'recommendations'],
    available: true,
  },
  transformation: {
    name: 'Transformation Agent',
    description: 'Creates derived datasets and repairs data issues',
    capabilities: ['data transformation', 'table creation', 'data repair'],
    available: false,
  },
};

export class OrchestratorAgent {
  private anthropic: Anthropic;
  private supabase = getAmygdalaClient();
  private meridian = getMeridianClient();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY is not set - chat will not work');
    }
    this.anthropic = new Anthropic({
      apiKey: apiKey || '',
    });
  }

  get systemPrompt(): string {
    return `You are the Orchestrator Agent for Amygdala, a data trust platform. Your role is to:

1. Understand user requests about data quality, trust, and management
2. Coordinate with specialized agents when needed
3. Provide helpful information about data assets, issues, and quality

Available Agents:
${Object.entries(AVAILABLE_AGENTS).map(([id, agent]) =>
  `- ${agent.name}: ${agent.description}
   Capabilities: ${agent.capabilities.join(', ')}
   Status: ${agent.available === false ? 'Coming Soon' : 'Available'}`
).join('\n')}

Current Data Context:
- Platform: Amygdala Data Trust Platform
- Sample Client: Meridian Bank
- Data Layers: consumer (reports/dashboards), gold (aggregated), silver (cleansed), bronze (raw)

When responding:
- Be concise and helpful
- If the user asks about data quality issues, suggest running the Spotter agent
- If discussing specific assets, provide relevant context
- Offer to take actions when appropriate
- Use markdown formatting for clarity

If you determine an agent should be run, include in your response:
[ACTION:RUN_AGENT:agent_name] - to trigger an agent run
[ACTION:SHOW_ISSUES] - to display current issues
[ACTION:SHOW_ASSETS] - to display catalog assets

Always be helpful and proactive in suggesting next steps.`;
  }

  async processMessage(
    userMessage: string,
    context: ChatContext
  ): Promise<OrchestratorResponse> {
    // Check if API key is configured
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
- Recent Agent Runs: ${dataContext.recentRuns}
- Average Quality: ${dataContext.avgQuality}%

Recent Issues:
${dataContext.recentIssuesSummary}
${entityContextInfo}`;

      // Call Claude API
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
          max_tokens: 1024,
          system: enrichedPrompt,
          messages,
        }),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('Anthropic API error:', fetchResponse.status, errorText);
        throw new Error(`API error ${fetchResponse.status}: ${errorText.slice(0, 100)}`);
      }

      const response = await fetchResponse.json();

      const textBlock = response.content.find((block) => block.type === 'text');
      const responseText = textBlock ? textBlock.text : 'I apologize, I could not process your request.';

      // Parse actions from response
      const action = this.parseAction(responseText);
      const cleanedMessage = this.cleanMessage(responseText);

      // Execute actions if needed
      if (action.type === 'run_agent' && action.details?.agent) {
        await this.executeAgentRun(action.details.agent);
      }

      return {
        message: cleanedMessage,
        agentUsed: 'orchestrator',
        action,
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
        } else if (error.message.includes('Connection error')) {
          errorMessage = 'Unable to connect to the AI service.';
        } else if (error.message.includes('404') || error.message.includes('model')) {
          errorMessage = 'AI model configuration error. Please contact support.';
        }
      }

      return {
        message: errorMessage,
        agentUsed: 'orchestrator',
        action: { type: 'none' },
      };
    }
  }

  private async gatherDataContext(): Promise<{
    assetCount: number;
    openIssues: number;
    recentRuns: number;
    avgQuality: number;
    recentIssuesSummary: string;
  }> {
    try {
      // Get asset count
      const { count: assetCount } = await this.supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });

      // Get open issues
      const { data: issues } = await this.supabase
        .from('issues')
        .select('*')
        .in('status', ['open', 'investigating', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent runs
      const { count: recentRuns } = await this.supabase
        .from('agent_runs')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Get average quality
      const { data: assets } = await this.supabase
        .from('assets')
        .select('quality_score')
        .not('quality_score', 'is', null);

      const avgQuality = assets && assets.length > 0
        ? Math.round(assets.reduce((sum, a) => sum + (a.quality_score || 0), 0) / assets.length)
        : 0;

      // Format issues summary
      const recentIssuesSummary = issues && issues.length > 0
        ? issues.map((i) => `- [${i.severity}] ${i.title}`).join('\n')
        : 'No open issues';

      return {
        assetCount: assetCount || 0,
        openIssues: issues?.length || 0,
        recentRuns: recentRuns || 0,
        avgQuality,
        recentIssuesSummary,
      };
    } catch (error) {
      console.error('Context gathering error:', error);
      return {
        assetCount: 0,
        openIssues: 0,
        recentRuns: 0,
        avgQuality: 0,
        recentIssuesSummary: 'Unable to fetch issues',
      };
    }
  }

  private async getEntityContextInfo(entityContext: NonNullable<ChatContext['entityContext']>): Promise<string> {
    try {
      if (entityContext.type === 'issue' && entityContext.id) {
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
- Status: ${issue.status}
- Description: ${issue.description}
- Affected Assets: ${issue.affected_assets?.join(', ') || 'None'}
${issue.metadata?.debuggerAnalysis ? `
Analysis Available:
- Root Cause: ${issue.metadata.debuggerAnalysis.rootCause}
- Confidence: ${issue.metadata.debuggerAnalysis.confidence}
- Recommendation: ${issue.metadata.debuggerAnalysis.recommendation}
` : ''}
Focus your responses on this specific issue. If the user asks about fixes, suggest running the Debugger agent to analyze the issue.`;
        }
      } else if (entityContext.type === 'asset' && entityContext.id) {
        const { data: asset } = await this.supabase
          .from('assets')
          .select('*')
          .eq('id', entityContext.id)
          .single();

        if (asset) {
          // Get open issues for this asset
          const { data: assetIssues } = await this.supabase
            .from('issues')
            .select('title, severity')
            .contains('affected_assets', [asset.name])
            .in('status', ['open', 'investigating', 'in_progress'])
            .limit(5);

          return `
FOCUSED CONTEXT - Asset:
You are helping the user with a specific data asset:
- Name: ${asset.name}
- Type: ${asset.asset_type}
- Layer: ${asset.layer}
- Description: ${asset.description || 'No description'}
- Quality Score: ${asset.quality_score || 'N/A'}%
- Trust Score: ${asset.trust_score_stars || 0}/5 stars
- Fitness Status: ${asset.fitness_status}
- Owner: ${asset.owner || 'Not assigned'}
- Steward: ${asset.steward || 'Not assigned'}
${assetIssues && assetIssues.length > 0 ? `
Open Issues:
${assetIssues.map(i => `- [${i.severity}] ${i.title}`).join('\n')}
` : ''}
Focus your responses on this specific asset. Help the user improve its trust score and resolve any issues.`;
        }
      }

      return '';
    } catch (error) {
      console.error('Entity context error:', error);
      return '';
    }
  }

  private parseAction(response: string): OrchestratorResponse['action'] {
    // Check for agent run action
    const agentMatch = response.match(/\[ACTION:RUN_AGENT:(\w+)\]/);
    if (agentMatch) {
      return { type: 'run_agent', details: { agent: agentMatch[1] } };
    }

    // Check for show issues action
    if (response.includes('[ACTION:SHOW_ISSUES]')) {
      return { type: 'show_data', details: { view: 'issues' } };
    }

    // Check for show assets action
    if (response.includes('[ACTION:SHOW_ASSETS]')) {
      return { type: 'show_data', details: { view: 'assets' } };
    }

    return { type: 'none' };
  }

  private cleanMessage(response: string): string {
    // Remove action markers from the response
    return response
      .replace(/\[ACTION:RUN_AGENT:\w+\]/g, '')
      .replace(/\[ACTION:SHOW_ISSUES\]/g, '')
      .replace(/\[ACTION:SHOW_ASSETS\]/g, '')
      .trim();
  }

  private async executeAgentRun(agentName: string): Promise<void> {
    try {
      if (agentName === 'spotter') {
        const spotter = getSpotterAgent();
        // Run asynchronously - don't await
        spotter.run().catch(console.error);
      }
    } catch (error) {
      console.error('Agent execution error:', error);
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
      suggestions.push('Help me set up the data catalog');
    } else {
      suggestions.push('Run a data quality scan');
      suggestions.push('Show me the trust index');
    }

    suggestions.push('What agents are available?');

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
