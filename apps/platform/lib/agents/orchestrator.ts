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
  },
  debugger: {
    name: 'Debugger',
    description: 'Investigates issues and finds root causes',
    capabilities: ['root cause analysis', 'lineage tracing', 'issue investigation'],
    available: false,
  },
  quality: {
    name: 'Quality Agent',
    description: 'Generates and enforces data quality rules',
    capabilities: ['rule generation', 'validation', 'quality scoring'],
    available: false,
  },
  transformation: {
    name: 'Transformation Agent',
    description: 'Creates derived datasets and repairs data issues',
    capabilities: ['data transformation', 'table creation', 'data repair'],
    available: false,
  },
  trust: {
    name: 'Trust Agent',
    description: 'Calculates trust scores for data assets',
    capabilities: ['trust scoring', 'fitness assessment', 'recommendations'],
    available: false,
  },
};

export class OrchestratorAgent {
  private anthropic: Anthropic;
  private supabase = getAmygdalaClient();
  private meridian = getMeridianClient();

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
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

      // Create enriched system prompt
      const enrichedPrompt = `${this.systemPrompt}

Current Platform State:
- Total Assets: ${dataContext.assetCount}
- Open Issues: ${dataContext.openIssues}
- Recent Agent Runs: ${dataContext.recentRuns}
- Average Quality: ${dataContext.avgQuality}%

Recent Issues:
${dataContext.recentIssuesSummary}`;

      // Call Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: enrichedPrompt,
        messages,
      });

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
      return {
        message: 'I encountered an error processing your request. Please try again.',
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
