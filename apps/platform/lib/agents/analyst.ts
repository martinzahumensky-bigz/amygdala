import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, AgentContext, AgentRunResult } from './base';
import { AtaccamaMCPClient, getAtaccamaMCPClient, MCPToolResult } from '../mcp/client';

// Demo mode flag - set to true to use mock data when MCP is unavailable
const DEMO_MODE = process.env.ANALYST_DEMO_MODE === 'true' || true; // Default to demo mode

export interface AnalystChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    toolsUsed?: string[];
    recommendations?: TableRecommendation[];
  };
}

export interface TableRecommendation {
  name: string;
  id: string;
  source: string;
  dqScore?: number;
  dqStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  owner?: string;
  description?: string;
  lastProfiled?: string;
  recommendation: 'recommended' | 'alternative' | 'not_recommended';
  reasons: string[];
}

export interface AnalystResponse {
  message: string;
  recommendations?: TableRecommendation[];
  toolsUsed?: string[];
  suggestions?: string[];
}

// Tool definitions for Claude API
const ANALYST_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_catalog_items',
    description: 'Search for data tables/catalog items in Ataccama. Use this when the user is looking for tables or datasets. You can filter by keywords like "customer", "transaction", "revenue", etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find catalog items (e.g., "customer", "transaction", "sales")',
        },
        connection_types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Filter by connection type (e.g., ["snowflake", "postgresql"])',
        },
      },
    },
  },
  {
    name: 'get_catalog_item_details',
    description: 'Get detailed information about a specific catalog item including its owner, description, and metadata.',
    input_schema: {
      type: 'object' as const,
      properties: {
        catalog_item_id: {
          type: 'string',
          description: 'The ID of the catalog item to get details for',
        },
      },
      required: ['catalog_item_id'],
    },
  },
  {
    name: 'get_data_quality_overview',
    description: 'Get the data quality score and overview for a catalog item. This shows the overall DQ score, passed/failed rules, and quality dimensions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        catalog_item_id: {
          type: 'string',
          description: 'The ID of the catalog item to get DQ overview for',
        },
      },
      required: ['catalog_item_id'],
    },
  },
  {
    name: 'get_profiling_results',
    description: 'Get profiling statistics for a catalog item including row counts, column stats, and data patterns.',
    input_schema: {
      type: 'object' as const,
      properties: {
        catalog_item_id: {
          type: 'string',
          description: 'The ID of the catalog item to get profiling for',
        },
      },
      required: ['catalog_item_id'],
    },
  },
  {
    name: 'search_sources',
    description: 'Search for data sources (databases, connections) in Ataccama. Use this to find available data sources.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query for sources (e.g., "snowflake", "production")',
        },
      },
    },
  },
];

export class AnalystAgent extends BaseAgent {
  private mcpClient: AtaccamaMCPClient | null = null;
  private conversationHistory: AnalystChatMessage[] = [];

  constructor() {
    super(
      'Analyst',
      'Helps business users find the best data tables for their analytical needs by evaluating data quality scores from Ataccama'
    );
  }

  get systemPrompt(): string {
    return `You are the Analyst Agent for Amygdala, a data trust platform. Your role is to help business users find the most reliable data tables for their analytical work.

You have access to Ataccama's data catalog and quality metrics through MCP tools. When a user asks for data for a specific analysis:

1. UNDERSTAND their business need (what analysis, what data domains)
2. SEARCH for relevant catalog items using search_catalog_items
3. EVALUATE each candidate by getting their data quality scores using get_data_quality_overview
4. RECOMMEND the best option with clear reasoning

When making recommendations:
- Always explain WHY you recommend a table (DQ score, ownership, freshness)
- Warn about any data quality issues that might affect the analysis
- Suggest alternatives if the primary recommendation has caveats
- Use clear formatting with emojis for status indicators

DQ Score interpretation:
- 90-100%: ✅ Excellent - Highly reliable
- 75-89%: 🟢 Good - Reliable with minor issues
- 60-74%: 🟡 Fair - Usable but review needed
- Below 60%: 🔴 Poor - Not recommended without remediation

Format recommendations like:
✅ RECOMMENDED: TABLE_NAME (Source)
   • Data Quality: XX%
   • Owner: name@company.com
   • Why: [clear reasoning]

⚠️ ALTERNATIVE: TABLE_NAME
   • Data Quality: XX%
   • Issues: [list concerns]

❌ NOT RECOMMENDED: TABLE_NAME
   • Data Quality: XX%
   • Issues: [critical problems]

Be concise but thorough. The goal is to help users trust their analytical results by choosing high-quality data.`;
  }

  /**
   * Initialize the MCP connection
   */
  async initializeMCP(): Promise<boolean> {
    try {
      this.mcpClient = await getAtaccamaMCPClient();
      await this.log('mcp_connected', 'Connected to Ataccama MCP server');
      return true;
    } catch (error) {
      console.error('[Analyst] Failed to connect to Ataccama MCP:', error);
      return false;
    }
  }

  /**
   * Process a chat message from the user
   */
  async chat(userMessage: string, history?: AnalystChatMessage[]): Promise<AnalystResponse> {
    // Check API key first
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[Analyst] ANTHROPIC_API_KEY not set');
      return {
        message: 'The AI service is not configured. Please set the ANTHROPIC_API_KEY environment variable.',
        suggestions: ['Check environment configuration'],
      };
    }

    // Try to connect to MCP if not in demo mode
    if (!DEMO_MODE && (!this.mcpClient || !this.mcpClient.isReady())) {
      const connected = await this.initializeMCP();
      if (!connected) {
        console.log('[Analyst] MCP connection failed, will use demo mode');
      }
    }

    // Build conversation history
    if (history) {
      this.conversationHistory = history;
    }

    const messages: Anthropic.MessageParam[] = this.conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    messages.push({ role: 'user', content: userMessage });

    try {
      // Call Claude API with tools using fetch (more reliable than SDK in serverless)
      const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: this.systemPrompt,
          messages,
          tools: ANALYST_TOOLS,
        }),
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        console.error('[Analyst] API error:', fetchResponse.status, errorText);
        throw new Error(`API error ${fetchResponse.status}: ${errorText.slice(0, 200)}`);
      }

      const response = await fetchResponse.json();

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        return await this.handleToolUse(response, messages, apiKey);
      }

      // Extract text response
      const textBlock = response.content.find((block: any) => block.type === 'text');
      const responseText = textBlock?.text || 'I could not process your request.';

      return {
        message: responseText,
        suggestions: this.generateSuggestions(userMessage),
      };
    } catch (error) {
      console.error('[Analyst] Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        message: `I encountered an error: ${errorMsg.slice(0, 100)}. Please try again.`,
        suggestions: ['Try rephrasing your request', 'Check if Ataccama is accessible'],
      };
    }
  }

  /**
   * Handle tool use requests from Claude
   */
  private async handleToolUse(
    response: any,
    messages: Anthropic.MessageParam[],
    apiKey: string
  ): Promise<AnalystResponse> {
    const toolUseBlocks = response.content.filter(
      (block: any) => block.type === 'tool_use'
    );

    const toolResults: any[] = [];
    const toolsUsed: string[] = [];
    const recommendations: TableRecommendation[] = [];

    // Execute each tool
    for (const toolBlock of toolUseBlocks) {
      toolsUsed.push(toolBlock.name);
      const result = await this.executeTool(toolBlock.name, toolBlock.input as Record<string, any>);

      // Parse recommendations if this is a DQ overview
      if (toolBlock.name === 'get_data_quality_overview' && result.success && result.data) {
        const rec = this.parseRecommendation(result.data);
        if (rec) recommendations.push(rec);
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    // Send tool results back to Claude using fetch
    const updatedMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: toolResults },
    ];

    const fetchResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: this.systemPrompt,
        messages: updatedMessages,
        tools: ANALYST_TOOLS,
      }),
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`API error: ${errorText}`);
    }

    const finalResponse = await fetchResponse.json();

    // Handle recursive tool use
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, updatedMessages, apiKey);
    }

    const textBlock = finalResponse.content.find((block: any) => block.type === 'text');
    const responseText = textBlock?.text || 'Analysis complete.';

    return {
      message: responseText,
      toolsUsed,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      suggestions: this.generateSuggestions(''),
    };
  }

  /**
   * Execute a tool using the MCP client or mock data
   */
  private async executeTool(toolName: string, input: Record<string, any>): Promise<MCPToolResult> {
    console.log(`[Analyst] Executing tool: ${toolName}`, input);

    // Use demo mode if MCP client is not available
    const useDemoMode = DEMO_MODE || !this.mcpClient || !this.mcpClient.isReady();

    if (useDemoMode) {
      console.log(`[Analyst] Using demo mode for tool: ${toolName}`);
      return this.executeToolDemo(toolName, input);
    }

    try {
      switch (toolName) {
        case 'search_catalog_items':
          return await this.mcpClient!.searchCatalogItems(input.query, input.connection_types);

        case 'get_catalog_item_details':
          return await this.mcpClient!.getCatalogItemDetails(input.catalog_item_id);

        case 'get_data_quality_overview':
          return await this.mcpClient!.getCatalogItemDQOverview(input.catalog_item_id);

        case 'get_profiling_results':
          return await this.mcpClient!.getCatalogItemProfiling(input.catalog_item_id);

        case 'search_sources':
          return await this.mcpClient!.searchSources(input.query);

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`[Analyst] MCP tool execution failed, falling back to demo mode:`, error);
      // Fallback to demo mode on MCP errors
      return this.executeToolDemo(toolName, input);
    }
  }

  /**
   * Execute a tool using mock/demo data
   */
  private executeToolDemo(toolName: string, input: Record<string, any>): MCPToolResult {
    switch (toolName) {
      case 'search_catalog_items':
        return getMockCatalogItems(input.query, input.connection_types);

      case 'get_catalog_item_details':
        return getMockCatalogItemDetails(input.catalog_item_id);

      case 'get_data_quality_overview':
        return getMockDQOverview(input.catalog_item_id);

      case 'get_profiling_results':
        return getMockProfiling(input.catalog_item_id);

      case 'search_sources':
        return getMockSources(input.query);

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  /**
   * Parse DQ overview into a recommendation
   */
  private parseRecommendation(data: any): TableRecommendation | null {
    try {
      const dqScore = data.overallScore || data.dq_score || data.score;
      let dqStatus: TableRecommendation['dqStatus'] = 'unknown';
      let recommendation: TableRecommendation['recommendation'] = 'alternative';
      const reasons: string[] = [];

      if (dqScore !== undefined) {
        if (dqScore >= 90) {
          dqStatus = 'excellent';
          recommendation = 'recommended';
          reasons.push('Excellent data quality score');
        } else if (dqScore >= 75) {
          dqStatus = 'good';
          recommendation = 'recommended';
          reasons.push('Good data quality with minor issues');
        } else if (dqScore >= 60) {
          dqStatus = 'fair';
          recommendation = 'alternative';
          reasons.push('Fair quality - review before use');
        } else {
          dqStatus = 'poor';
          recommendation = 'not_recommended';
          reasons.push('Low quality score - not recommended');
        }
      }

      return {
        name: data.name || data.catalogItemName || 'Unknown',
        id: data.id || data.catalogItemId || '',
        source: data.source || data.connectionName || 'Unknown source',
        dqScore,
        dqStatus,
        owner: data.owner || data.steward,
        description: data.description,
        lastProfiled: data.lastProfiledAt || data.lastUpdated,
        recommendation,
        reasons,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(userMessage: string): string[] {
    const suggestions = [
      'Show me tables with the highest data quality',
      'Find customer data for segmentation analysis',
      'What revenue tables are available?',
      'Compare data quality across sources',
    ];

    // Filter out the current message if it matches
    return suggestions.filter((s) => s.toLowerCase() !== userMessage.toLowerCase()).slice(0, 3);
  }

  /**
   * Run the agent (required by BaseAgent)
   */
  async run(context?: AgentContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runId = await this.startRun(context);

    try {
      // Connect to MCP
      const connected = await this.initializeMCP();
      if (!connected) {
        await this.failRun(runId, 'Failed to connect to Ataccama MCP');
        return {
          success: false,
          runId,
          stats: {},
          issuesCreated: 0,
          errors: ['Failed to connect to Ataccama MCP'],
          duration: Date.now() - startTime,
        };
      }

      // List available tools for verification
      const tools = await this.mcpClient!.listTools();
      await this.log('mcp_tools_listed', `Found ${tools.length} Ataccama tools available`);

      await this.completeRun(runId, {
        mcpConnected: true,
        toolsAvailable: tools.length,
      });

      return {
        success: true,
        runId,
        stats: {
          mcpToolsAvailable: tools.length,
        },
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
        stats: {},
        issuesCreated: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

// Demo/Mock data for showcasing the agent without Ataccama connection
const MOCK_CATALOG_ITEMS = [
  {
    id: 'cat-001',
    name: 'CUSTOMER_360',
    type: 'table',
    source: 'Snowflake / PROD_DW',
    connectionType: 'snowflake',
    owner: 'data-engineering@acme.com',
    steward: 'jane.doe@acme.com',
    description: 'Unified customer view combining CRM, transactions, and support data',
    rowCount: 2450000,
    lastProfiled: '2026-02-04T10:30:00Z',
    dqScore: 94.2,
    tags: ['customer', 'master-data', 'pii'],
  },
  {
    id: 'cat-002',
    name: 'CUSTOMER_RAW',
    type: 'table',
    source: 'Snowflake / STAGING',
    connectionType: 'snowflake',
    owner: 'ingestion-team@acme.com',
    description: 'Raw customer data from source systems before transformation',
    rowCount: 2890000,
    lastProfiled: '2026-02-03T08:15:00Z',
    dqScore: 78.5,
    tags: ['customer', 'raw', 'staging'],
  },
  {
    id: 'cat-003',
    name: 'CUSTOMER_LEGACY',
    type: 'table',
    source: 'Oracle / LEGACY_DB',
    connectionType: 'oracle',
    owner: 'legacy-support@acme.com',
    description: 'Legacy customer table from old CRM system',
    rowCount: 1850000,
    lastProfiled: '2025-12-15T14:00:00Z',
    dqScore: 52.1,
    tags: ['customer', 'legacy', 'deprecated'],
  },
  {
    id: 'cat-004',
    name: 'TRANSACTIONS_GOLD',
    type: 'table',
    source: 'Snowflake / PROD_DW',
    connectionType: 'snowflake',
    owner: 'finance-data@acme.com',
    steward: 'john.smith@acme.com',
    description: 'Cleaned and validated transaction data for analytics',
    rowCount: 45000000,
    lastProfiled: '2026-02-05T06:00:00Z',
    dqScore: 91.8,
    tags: ['transactions', 'gold', 'finance'],
  },
  {
    id: 'cat-005',
    name: 'REVENUE_DAILY',
    type: 'table',
    source: 'Snowflake / PROD_DW',
    connectionType: 'snowflake',
    owner: 'bi-team@acme.com',
    description: 'Daily aggregated revenue metrics by region and product',
    rowCount: 125000,
    lastProfiled: '2026-02-05T07:30:00Z',
    dqScore: 88.3,
    tags: ['revenue', 'aggregated', 'bi'],
  },
  {
    id: 'cat-006',
    name: 'FRAUD_EVENTS',
    type: 'table',
    source: 'Snowflake / SECURITY_DW',
    connectionType: 'snowflake',
    owner: 'security-team@acme.com',
    steward: 'risk.analyst@acme.com',
    description: 'Detected fraud events with risk scores and investigation status',
    rowCount: 89000,
    lastProfiled: '2026-02-05T08:00:00Z',
    dqScore: 96.5,
    tags: ['fraud', 'security', 'sensitive'],
  },
];

const MOCK_SOURCES = [
  {
    id: 'src-001',
    name: 'PROD_DW',
    type: 'snowflake',
    description: 'Production data warehouse on Snowflake',
    catalogItemCount: 450,
    connectionString: 'snowflake://acme.snowflakecomputing.com/PROD_DW',
  },
  {
    id: 'src-002',
    name: 'STAGING',
    type: 'snowflake',
    description: 'Staging environment for data ingestion',
    catalogItemCount: 120,
    connectionString: 'snowflake://acme.snowflakecomputing.com/STAGING',
  },
  {
    id: 'src-003',
    name: 'LEGACY_DB',
    type: 'oracle',
    description: 'Legacy Oracle database (read-only)',
    catalogItemCount: 85,
    connectionString: 'oracle://legacy.acme.internal:1521/LEGACYDB',
  },
];

function getMockCatalogItems(query?: string, connectionTypes?: string[]): MCPToolResult {
  let items = [...MOCK_CATALOG_ITEMS];

  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.includes(q))
    );
  }

  if (connectionTypes && connectionTypes.length > 0) {
    items = items.filter((item) =>
      connectionTypes.some((ct) => item.connectionType.toLowerCase() === ct.toLowerCase())
    );
  }

  return {
    success: true,
    data: {
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        source: item.source,
        description: item.description,
        owner: item.owner,
        tags: item.tags,
      })),
      totalCount: items.length,
    },
  };
}

function getMockCatalogItemDetails(catalogItemId: string): MCPToolResult {
  const item = MOCK_CATALOG_ITEMS.find((i) => i.id === catalogItemId);
  if (!item) {
    return { success: false, error: `Catalog item ${catalogItemId} not found` };
  }

  return {
    success: true,
    data: {
      ...item,
      columns: [
        { name: 'id', type: 'VARCHAR', nullable: false },
        { name: 'customer_name', type: 'VARCHAR', nullable: false },
        { name: 'email', type: 'VARCHAR', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false },
      ],
    },
  };
}

function getMockDQOverview(catalogItemId: string): MCPToolResult {
  const item = MOCK_CATALOG_ITEMS.find((i) => i.id === catalogItemId);
  if (!item) {
    return { success: false, error: `Catalog item ${catalogItemId} not found` };
  }

  const passedRules = Math.floor(item.dqScore / 10);
  const totalRules = 10;

  return {
    success: true,
    data: {
      catalogItemId: item.id,
      catalogItemName: item.name,
      overallScore: item.dqScore,
      source: item.source,
      owner: item.owner,
      steward: item.steward,
      lastProfiledAt: item.lastProfiled,
      dimensions: {
        completeness: item.dqScore + Math.random() * 5 - 2.5,
        accuracy: item.dqScore + Math.random() * 5 - 2.5,
        consistency: item.dqScore + Math.random() * 5 - 2.5,
        timeliness: item.dqScore + Math.random() * 5 - 2.5,
      },
      rules: {
        passed: passedRules,
        failed: totalRules - passedRules,
        total: totalRules,
      },
    },
  };
}

function getMockProfiling(catalogItemId: string): MCPToolResult {
  const item = MOCK_CATALOG_ITEMS.find((i) => i.id === catalogItemId);
  if (!item) {
    return { success: false, error: `Catalog item ${catalogItemId} not found` };
  }

  return {
    success: true,
    data: {
      catalogItemId: item.id,
      catalogItemName: item.name,
      rowCount: item.rowCount,
      columnCount: 4,
      lastProfiledAt: item.lastProfiled,
      sampleData: [
        { id: '1001', customer_name: 'Acme Corp', email: 'contact@acme.com', created_at: '2025-01-15' },
        { id: '1002', customer_name: 'TechStart Inc', email: 'info@techstart.io', created_at: '2025-02-20' },
      ],
    },
  };
}

function getMockSources(query?: string): MCPToolResult {
  let sources = [...MOCK_SOURCES];

  if (query) {
    const q = query.toLowerCase();
    sources = sources.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    data: { sources, totalCount: sources.length },
  };
}

// Singleton instance
let analystInstance: AnalystAgent | null = null;

export function getAnalystAgent(): AnalystAgent {
  if (!analystInstance) {
    analystInstance = new AnalystAgent();
  }
  return analystInstance;
}
