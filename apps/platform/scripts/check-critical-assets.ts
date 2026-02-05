#!/usr/bin/env npx tsx
/**
 * CLI Agent: Check Critical Data Assets
 *
 * Connects to Ataccama MCP to check data quality and trust for critical tables.
 *
 * Usage:
 *   npx tsx scripts/check-critical-assets.ts
 *   npx tsx scripts/check-critical-assets.ts --tables CUSTOMER_360,BANK_TRANSACTIONS
 *   npx tsx scripts/check-critical-assets.ts --verbose
 *   npx tsx scripts/check-critical-assets.ts --discover          # List available tables
 *   npx tsx scripts/check-critical-assets.ts --discover --query customer  # Search for specific tables
 */

import { spawn, ChildProcess } from 'child_process';

// ============================================
// Configuration
// ============================================

const DEFAULT_TABLES = [
  'BANK_TRANSACTIONS',
  'CUSTOMER',
  'CUSTOMERS',
];

const THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 60,
  trust: 70, // Minimum score to be considered "trusted"
};

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const discoverMode = args.includes('--discover') || args.includes('-d');
const queryArg = args.find(a => a.startsWith('--query='));
const discoverQuery = queryArg ? queryArg.split('=')[1] : '';
const tablesArg = args.find(a => a.startsWith('--tables='));
const tablesToCheck = tablesArg
  ? tablesArg.split('=')[1].split(',').map(t => t.trim().toUpperCase())
  : DEFAULT_TABLES;

// ============================================
// MCP Client (simplified for CLI)
// ============================================

class MCPClient {
  private process: ChildProcess | null = null;
  private buffer: string = '';
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private initialized: boolean = false;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const uvPath = process.env.UV_PATH || '/Users/martin.zahumensky/.local/bin/uv';
      const mcpDir = process.env.ATACCAMA_MCP_DIR || '/Users/martin.zahumensky/.claude/mcp-servers/ataccama';

      if (verbose) {
        console.log(`🔌 Starting Ataccama MCP server...`);
        console.log(`   UV Path: ${uvPath}`);
        console.log(`   MCP Dir: ${mcpDir}`);
      }

      this.process = spawn(uvPath, [
        '--directory', mcpDir,
        'run', '--python', '3.11',
        'manage.py', 'run-local',
      ], {
        env: {
          ...process.env,
          ATACCAMA_SERVER_URL: process.env.ATACCAMA_SERVER_URL || 'https://dogfooding.ataccama.one/',
          KEYCLOAK__REALM: process.env.KEYCLOAK_REALM || 'dogfooding-zesty',
          KEYCLOAK__CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'agentbe-ataccama-mcp-public-client',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.handleData(data.toString());
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        if (verbose) {
          console.error(`[MCP stderr] ${data.toString().trim()}`);
        }
      });

      this.process.on('error', (error) => {
        reject(new Error(`Failed to start MCP server: ${error.message}`));
      });

      this.process.on('close', (code) => {
        if (verbose) {
          console.log(`[MCP] Process exited with code ${code}`);
        }
        this.initialized = false;
      });

      // Wait for server to start, then initialize
      setTimeout(async () => {
        try {
          await this.initialize();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 2000);
    });
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'check-critical-assets', version: '1.0.0' },
    });

    if (verbose) {
      console.log(`✅ MCP initialized: ${response.serverInfo?.name || 'unknown'}`);
    }

    this.sendNotification('notifications/initialized', {});
    this.initialized = true;
  }

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line);
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id)!;
          this.pendingRequests.delete(message.id);
          if (message.error) {
            reject(new Error(message.error.message || 'MCP error'));
          } else {
            resolve(message.result);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.process?.stdin) throw new Error('MCP not started');

    const id = ++this.requestId;
    const request = { jsonrpc: '2.0', id, method, params: params || {} };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 60000); // 60 second timeout
    });
  }

  private sendNotification(method: string, params?: any): void {
    if (!this.process?.stdin) return;
    this.process.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: params || {} }) + '\n');
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.initialized) throw new Error('MCP not initialized');

    const response = await this.sendRequest('tools/call', { name, arguments: args });

    if (response.content && Array.isArray(response.content)) {
      const textContent = response.content.find((c: any) => c.type === 'text');
      if (textContent) {
        try {
          return JSON.parse(textContent.text);
        } catch {
          return textContent.text;
        }
      }
    }
    return response;
  }

  async listTools(): Promise<any> {
    return this.sendRequest('tools/list', {});
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// ============================================
// Result Types
// ============================================

interface TableResult {
  table: string;
  found: boolean;
  catalogItemId?: string;
  dqScore?: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  trusted: boolean;
  source?: string;
  owner?: string;
  lastProfiled?: string;
  details?: {
    validity?: number;
    completeness?: number;
    uniqueness?: number;
    consistency?: number;
  };
}

// ============================================
// Discovery Mode
// ============================================

async function discoverTables(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🔍 DISCOVER TABLES IN ATACCAMA CATALOG              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (discoverQuery) {
    console.log(`🔎 Search query: "${discoverQuery}"`);
  } else {
    console.log('🔎 Listing all available tables (use --query=<term> to search)');
  }
  console.log('');

  const client = new MCPClient();

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 Connecting to Ataccama MCP...');
    await client.connect();
    console.log('✅ Connected to Ataccama MCP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Search catalog
    const searchResult = await client.callTool('search_catalog_item', {
      query: discoverQuery || '',
    });

    if (verbose) {
      console.log('Raw search result:');
      console.log(JSON.stringify(searchResult, null, 2));
      console.log('');
    }

    // Handle different response structures
    let items = searchResult?.items || searchResult?.search_results || searchResult?.data || searchResult?.results || [];
    if (!Array.isArray(items) && typeof searchResult === 'object') {
      // Try to extract items from different response formats
      items = Object.values(searchResult).find(v => Array.isArray(v)) || [];
    }

    // Normalize item format (search_results uses 'gid' and 'display_name')
    items = items.map((item: any) => ({
      id: item.id || item.gid,
      name: item.name || item.display_name,
      type: item.type || 'unknown',
      connection_name: item.connection_name,
      source: item.source,
      owner_email: item.owner_email,
      steward_email: item.steward_email,
      description: item.description,
    }));

    if (!items?.length) {
      console.log('❓ No items found in the catalog');
      if (!verbose) {
        console.log('   (run with --verbose to see raw API response)');
      }
      console.log('');
      return;
    }
    console.log(`📋 Found ${items.length} catalog items:`);
    console.log('');

    // Group by type/connection if available
    const byConnection: Record<string, any[]> = {};

    for (const item of items) {
      const connection = item.connection_name || item.source || 'Unknown Source';
      if (!byConnection[connection]) {
        byConnection[connection] = [];
      }
      byConnection[connection].push(item);
    }

    // Display grouped results
    for (const [connection, connectionItems] of Object.entries(byConnection)) {
      console.log(`📁 ${connection}`);
      for (const item of connectionItems) {
        const type = item.type || 'table';
        const name = item.name || item.id;
        console.log(`   └── ${name} (${type})`);

        if (verbose) {
          if (item.id) console.log(`       ID: ${item.id}`);
          if (item.description) console.log(`       Description: ${item.description.slice(0, 50)}${item.description.length > 50 ? '...' : ''}`);
          if (item.owner_email || item.steward_email) {
            console.log(`       Owner: ${item.owner_email || item.steward_email}`);
          }
        }
      }
      console.log('');
    }

    // Print usage hint
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 TIP: To check specific tables, run:');

    // Get first few table names for example
    const exampleTables = items.slice(0, 3).map((i: any) => i.name).filter(Boolean);
    if (exampleTables.length > 0) {
      console.log(`   npx tsx scripts/check-critical-assets.ts --tables=${exampleTables.join(',')}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } finally {
    client.disconnect();
  }
}

// ============================================
// Main Agent Logic
// ============================================

async function checkCriticalAssets(): Promise<void> {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          🔍 CRITICAL DATA ASSETS QUALITY CHECK               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📋 Tables to check: ${tablesToCheck.join(', ')}`);
  console.log(`🎯 Trust threshold: ${THRESHOLDS.trust}%`);
  console.log('');

  const client = new MCPClient();
  const results: TableResult[] = [];

  try {
    // Connect to Ataccama MCP
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 Connecting to Ataccama MCP...');
    await client.connect();
    console.log('✅ Connected to Ataccama MCP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Check each table
    for (const tableName of tablesToCheck) {
      console.log(`📊 Checking: ${tableName}...`);

      try {
        // Search for catalog item
        const searchResult = await client.callTool('search_catalog_item', {
          query: tableName,
        });

        // Handle different response formats
        const rawItems = searchResult?.items || searchResult?.search_results || [];

        if (!rawItems?.length) {
          results.push({
            table: tableName,
            found: false,
            status: 'unknown',
            trusted: false,
          });
          console.log(`   ❓ Not found in Ataccama catalog`);
          continue;
        }

        // Normalize items (search_results uses 'gid' and 'display_name')
        const items = rawItems.map((item: any) => ({
          id: item.id || item.gid,
          name: item.name || item.display_name,
          type: item.type,
          connection_name: item.connection_name,
          source: item.source,
          owner_email: item.owner_email,
          steward_email: item.steward_email,
        }));

        // Find best match
        const exactMatch = items.find((item: any) =>
          item.name?.toUpperCase() === tableName.toUpperCase()
        );
        const catalogItem = exactMatch || items[0];

        if (verbose) {
          console.log(`   Found: ${catalogItem.name} (ID: ${catalogItem.id})`);
        }

        // First get DQ configurations for this catalog item
        const dqConfigs = await client.callTool('list_catalog_item_dq_configuration', {
          gid: catalogItem.id,
        });

        if (verbose && dqConfigs) {
          console.log(`   DQ Configs: ${JSON.stringify(dqConfigs, null, 2).slice(0, 500)}`);
        }

        // Extract configuration GIDs
        const configGids: string[] = [];
        const configsList = dqConfigs?.dq_configurations || dqConfigs?.configurations || dqConfigs;
        if (Array.isArray(configsList)) {
          for (const config of configsList) {
            if (config.gid) configGids.push(config.gid);
          }
        }

        // Get DQ overview (only if we have configurations)
        let dqResult: any = null;
        if (configGids.length > 0) {
          // Use only the first (Primary) configuration for speed
          const primaryConfigGid = configGids[0];
          if (verbose) {
            console.log(`   Using DQ config: ${primaryConfigGid}`);
          }

          dqResult = await client.callTool('detail_catalog_item_dq_overview', {
            gid: catalogItem.id,
            dq_configuration_gids: primaryConfigGid,
          });

          if (verbose && dqResult) {
            console.log(`   DQ Result: ${JSON.stringify(dqResult, null, 2).slice(0, 500)}`);
          }
        } else {
          if (verbose) {
            console.log(`   No DQ configurations found for this item`);
          }
        }

        // Extract scores
        let dqScore = 0;
        const details: TableResult['details'] = {};
        let passedCount = 0;
        let failedCount = 0;

        if (dqResult) {
          // Handle array response format (from dq_overview)
          if (Array.isArray(dqResult) && dqResult.length > 0) {
            // Sum up passed/failed counts from all evaluations
            for (const evaluation of dqResult) {
              passedCount += evaluation.passed_count || 0;
              failedCount += evaluation.failed_count || 0;
            }
            const totalCount = passedCount + failedCount;
            if (totalCount > 0) {
              dqScore = (passedCount / totalCount) * 100;
            }
            if (verbose) {
              console.log(`   Passed: ${passedCount}, Failed: ${failedCount}, Score: ${dqScore.toFixed(1)}%`);
            }
          }
          // Try other response formats
          else if (typeof dqResult.overall_score === 'number') {
            dqScore = dqResult.overall_score * 100;
          } else if (typeof dqResult.overallScore === 'number') {
            dqScore = dqResult.overallScore * 100;
          } else if (typeof dqResult.dq_score === 'number') {
            dqScore = dqResult.dq_score;
          }

          // Extract dimension scores
          if (dqResult.dimensions) {
            for (const dim of dqResult.dimensions) {
              const name = dim.name?.toLowerCase() || '';
              const score = (dim.score || 0) * 100;
              if (name.includes('valid')) details.validity = score;
              else if (name.includes('complet')) details.completeness = score;
              else if (name.includes('unique')) details.uniqueness = score;
              else if (name.includes('consist')) details.consistency = score;
            }
          }

          // Calculate from dimensions if overall not available
          if (dqScore === 0 && Object.keys(details).length > 0) {
            const scores = Object.values(details);
            dqScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          }
        }

        // Determine status
        let status: TableResult['status'];
        if (dqScore >= THRESHOLDS.excellent) status = 'excellent';
        else if (dqScore >= THRESHOLDS.good) status = 'good';
        else if (dqScore >= THRESHOLDS.fair) status = 'fair';
        else status = 'poor';

        const trusted = dqScore >= THRESHOLDS.trust;
        const roundedScore = Math.round(dqScore * 10) / 10;

        results.push({
          table: tableName,
          found: true,
          catalogItemId: catalogItem.id,
          dqScore: roundedScore,
          status,
          trusted,
          source: catalogItem.connection_name || catalogItem.source,
          owner: catalogItem.owner_email || catalogItem.steward_email,
          lastProfiled: catalogItem.last_profiled_at,
          details: Object.keys(details).length > 0 ? details : undefined,
        });

        const icon = status === 'excellent' ? '✅' :
                     status === 'good' ? '🟢' :
                     status === 'fair' ? '🟡' : '🔴';
        const trustIcon = trusted ? '🔒' : '⚠️';

        console.log(`   ${icon} DQ Score: ${roundedScore}% | ${trustIcon} ${trusted ? 'Trusted' : 'Not Trusted'}`);

        if (verbose && details) {
          if (details.validity) console.log(`      • Validity: ${details.validity.toFixed(1)}%`);
          if (details.completeness) console.log(`      • Completeness: ${details.completeness.toFixed(1)}%`);
          if (details.uniqueness) console.log(`      • Uniqueness: ${details.uniqueness.toFixed(1)}%`);
          if (details.consistency) console.log(`      • Consistency: ${details.consistency.toFixed(1)}%`);
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          table: tableName,
          found: false,
          status: 'unknown',
          trusted: false,
        });
      }

      console.log('');
    }

  } finally {
    client.disconnect();
  }

  // Print summary
  printSummary(results);
}

function printSummary(results: TableResult[]): void {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                        📊 SUMMARY                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);
  const trusted = results.filter(r => r.trusted);
  const untrusted = found.filter(r => !r.trusted);

  const excellent = results.filter(r => r.status === 'excellent').length;
  const good = results.filter(r => r.status === 'good').length;
  const fair = results.filter(r => r.status === 'fair').length;
  const poor = results.filter(r => r.status === 'poor').length;

  console.log(`📈 Tables Checked: ${results.length}`);
  console.log(`   ✅ Found in catalog: ${found.length}`);
  console.log(`   ❓ Not found: ${notFound.length}`);
  console.log('');
  console.log(`🎯 Quality Distribution:`);
  console.log(`   ✅ Excellent (≥${THRESHOLDS.excellent}%): ${excellent}`);
  console.log(`   🟢 Good (≥${THRESHOLDS.good}%): ${good}`);
  console.log(`   🟡 Fair (≥${THRESHOLDS.fair}%): ${fair}`);
  console.log(`   🔴 Poor (<${THRESHOLDS.fair}%): ${poor}`);
  console.log('');
  console.log(`🔒 Trust Assessment:`);
  console.log(`   🔒 Trusted (≥${THRESHOLDS.trust}%): ${trusted.length}`);
  console.log(`   ⚠️  Not Trusted: ${untrusted.length}`);

  if (untrusted.length > 0) {
    console.log('');
    console.log('⚠️  UNTRUSTED ASSETS REQUIRING ATTENTION:');
    for (const r of untrusted) {
      console.log(`   • ${r.table}: ${r.dqScore}% (${r.status})`);
    }
  }

  if (notFound.length > 0) {
    console.log('');
    console.log('❓ TABLES NOT FOUND IN ATACCAMA:');
    for (const r of notFound) {
      console.log(`   • ${r.table}`);
    }
  }

  // Overall verdict
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allTrusted = found.length > 0 && untrusted.length === 0;
  if (allTrusted) {
    console.log('✅ VERDICT: All critical data assets meet trust requirements');
  } else if (untrusted.length > 0) {
    console.log(`⚠️  VERDICT: ${untrusted.length} asset(s) below trust threshold - investigation needed`);
  } else {
    console.log('❓ VERDICT: Could not assess - no tables found in catalog');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// ============================================
// Run
// ============================================

async function listMCPTools(): Promise<void> {
  console.log('');
  console.log('Listing available MCP tools...');
  console.log('');

  const client = new MCPClient();

  try {
    await client.connect();
    console.log('Connected. Listing tools...');
    console.log('');

    const tools = await client.listTools();

    if (tools?.tools) {
      for (const tool of tools.tools) {
        console.log(`📦 ${tool.name}`);
        if (tool.description) {
          console.log(`   ${tool.description.slice(0, 100)}${tool.description.length > 100 ? '...' : ''}`);
        }
        if (tool.inputSchema?.required) {
          console.log(`   Required: ${tool.inputSchema.required.join(', ')}`);
        }
        console.log('');
      }
    }
  } finally {
    client.disconnect();
  }
}

async function main(): Promise<void> {
  if (args.includes('--list-tools')) {
    await listMCPTools();
  } else if (discoverMode) {
    await discoverTables();
  } else {
    await checkCriticalAssets();
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
