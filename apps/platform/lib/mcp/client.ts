import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

/**
 * MCP Client for communicating with MCP servers via stdio
 *
 * This client spawns an MCP server as a subprocess and communicates
 * with it using the Model Context Protocol over stdin/stdout.
 */
export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer: string = '';
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private initialized: boolean = false;
  private serverName: string;

  constructor(serverName: string = 'mcp-server') {
    super();
    this.serverName = serverName;
  }

  /**
   * Start the MCP server process
   */
  async start(command: string, args: string[], env?: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const processEnv = {
          ...process.env,
          ...env,
        };

        console.log(`[MCP] Starting server: ${command} ${args.join(' ')}`);

        this.process = spawn(command, args, {
          env: processEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleData(data.toString());
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          console.error(`[MCP ${this.serverName}] stderr:`, data.toString());
        });

        this.process.on('error', (error) => {
          console.error(`[MCP ${this.serverName}] Process error:`, error);
          reject(error);
        });

        this.process.on('close', (code) => {
          console.log(`[MCP ${this.serverName}] Process exited with code ${code}`);
          this.initialized = false;
          this.process = null;
        });

        // Give the server time to start up
        setTimeout(async () => {
          try {
            await this.initialize();
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize the MCP session
   */
  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'amygdala-analyst',
        version: '1.0.0',
      },
    });

    console.log(`[MCP ${this.serverName}] Initialized:`, response);

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});
    this.initialized = true;
  }

  /**
   * Handle incoming data from the server
   */
  private handleData(data: string): void {
    this.buffer += data;

    // MCP uses JSON-RPC over newline-delimited JSON
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        console.error(`[MCP ${this.serverName}] Failed to parse message:`, line);
      }
    }
  }

  /**
   * Handle a parsed MCP message
   */
  private handleMessage(message: any): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'Unknown MCP error'));
      } else {
        resolve(message.result);
      }
    } else if (message.method) {
      // Handle server-initiated requests/notifications
      this.emit('notification', message);
    }
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process?.stdin) {
      throw new Error('MCP server not started');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || {},
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Send a notification (no response expected)
   */
  private sendNotification(method: string, params?: any): void {
    if (!this.process?.stdin) {
      throw new Error('MCP server not started');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params: params || {},
    };

    this.process.stdin.write(JSON.stringify(notification) + '\n');
  }

  /**
   * List available tools from the MCP server
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    const response = await this.sendRequest('tools/list', {});
    return response.tools || [];
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    if (!this.initialized) {
      throw new Error('MCP client not initialized');
    }

    try {
      const response = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args,
      });

      // MCP tool responses have content array
      if (response.content && Array.isArray(response.content)) {
        const textContent = response.content.find((c: any) => c.type === 'text');
        if (textContent) {
          try {
            return {
              success: true,
              data: JSON.parse(textContent.text),
            };
          } catch {
            return {
              success: true,
              data: textContent.text,
            };
          }
        }
      }

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stop the MCP server process
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.initialized = false;
    }
  }

  /**
   * Check if the client is connected and initialized
   */
  isReady(): boolean {
    return this.initialized && this.process !== null;
  }
}

/**
 * Ataccama MCP Client - preconfigured for Ataccama server
 */
export class AtaccamaMCPClient extends MCPClient {
  constructor() {
    super('ataccama');
  }

  /**
   * Start the Ataccama MCP server with default configuration
   */
  async connect(): Promise<void> {
    const uvPath = process.env.UV_PATH || '/Users/martin.zahumensky/.local/bin/uv';
    const mcpDir = process.env.ATACCAMA_MCP_DIR || '/Users/martin.zahumensky/.claude/mcp-servers/ataccama';

    await this.start(uvPath, [
      '--directory',
      mcpDir,
      'run',
      '--python',
      '3.11',
      'manage.py',
      'run-local',
    ], {
      ATACCAMA_SERVER_URL: process.env.ATACCAMA_SERVER_URL || 'https://dogfooding.ataccama.one/',
      KEYCLOAK__REALM: process.env.KEYCLOAK_REALM || 'dogfooding-zesty',
      KEYCLOAK__CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'agentbe-ataccama-mcp-public-client',
    });
  }

  /**
   * Search for catalog items
   */
  async searchCatalogItems(query?: string, connectionTypes?: string[]): Promise<MCPToolResult> {
    return this.callTool('search_catalog_item', {
      query: query || '',
      connection_types: connectionTypes,
    });
  }

  /**
   * Get detailed information about a catalog item
   */
  async getCatalogItemDetails(catalogItemId: string): Promise<MCPToolResult> {
    return this.callTool('detail_catalog_item', {
      catalog_item_id: catalogItemId,
    });
  }

  /**
   * Get data quality overview for a catalog item
   */
  async getCatalogItemDQOverview(catalogItemId: string): Promise<MCPToolResult> {
    return this.callTool('detail_catalog_item_dq_overview', {
      catalog_item_id: catalogItemId,
    });
  }

  /**
   * Get profiling information for a catalog item
   */
  async getCatalogItemProfiling(catalogItemId: string): Promise<MCPToolResult> {
    return this.callTool('detail_catalog_item_profiling', {
      catalog_item_id: catalogItemId,
    });
  }

  /**
   * Get attribute profiling for a catalog item
   */
  async getAttributeProfiling(catalogItemId: string): Promise<MCPToolResult> {
    return this.callTool('detail_attribute_profiling', {
      catalog_item_id: catalogItemId,
    });
  }

  /**
   * Search for data quality rules
   */
  async searchDQRules(query?: string): Promise<MCPToolResult> {
    return this.callTool('search_data_quality_rules', {
      query: query || '',
    });
  }

  /**
   * List DQ configurations for a catalog item
   */
  async listDQConfigurations(catalogItemId: string): Promise<MCPToolResult> {
    return this.callTool('list_catalog_item_dq_configuration', {
      catalog_item_id: catalogItemId,
    });
  }

  /**
   * Search for sources
   */
  async searchSources(query?: string): Promise<MCPToolResult> {
    return this.callTool('search_sources', {
      query: query || '',
    });
  }

  /**
   * Get source details
   */
  async getSourceDetails(sourceId: string): Promise<MCPToolResult> {
    return this.callTool('detail_source', {
      source_id: sourceId,
    });
  }
}

// Singleton instance
let ataccamaClient: AtaccamaMCPClient | null = null;

export async function getAtaccamaMCPClient(): Promise<AtaccamaMCPClient> {
  if (!ataccamaClient || !ataccamaClient.isReady()) {
    ataccamaClient = new AtaccamaMCPClient();
    await ataccamaClient.connect();
  }
  return ataccamaClient;
}

export function disconnectAtaccamaMCP(): void {
  if (ataccamaClient) {
    ataccamaClient.stop();
    ataccamaClient = null;
  }
}
