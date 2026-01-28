import { BaseAgent, AgentContext, AgentRunResult, DetectedIssue } from './base';
import { getMeridianClient, getAmygdalaClient } from '../supabase/client';
import type { DataLayer, AssetType, FitnessStatus, ColumnProfile } from '@amygdala/database';

interface TableInfo {
  table_name: string;
  table_type: 'BASE TABLE' | 'VIEW';
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

interface DiscoveredAsset {
  name: string;
  asset_type: AssetType;
  layer: DataLayer;
  description?: string;
  business_context?: string;
  tags: string[];
  source_table: string;
  profile?: {
    row_count: number;
    column_count: number;
    columns: ColumnProfile[];
  };
  isNew: boolean;
}

interface DocumentaristResult {
  assetsDiscovered: number;
  assetsCreated: number;
  assetsUpdated: number;
  ownershipIssuesCreated: number;
  profilesGenerated: number;
  lineageRelationshipsFound: number;
}

interface PipelineInfo {
  id: string;
  name: string;
  description?: string;
  source_table: string;
  target_table: string;
  schedule?: string;
  is_active: boolean;
}

interface LineageRelationship {
  sourceAsset: string;
  targetAsset: string;
  relationshipType: 'pipeline' | 'inferred' | 'foreign_key';
  pipelineName?: string;
  confidence: 'high' | 'medium' | 'low';
}

export class DocumentaristAgent extends BaseAgent {
  private meridianClient = getMeridianClient();
  private amygdalaClient = getAmygdalaClient();

  constructor() {
    super('documentarist', 'Discovers and documents data assets automatically');
  }

  get systemPrompt(): string {
    return `You are the Documentarist agent for the Amygdala data trust platform. Your role is to:

1. Discover and catalog data assets in the organization
2. Generate meaningful descriptions based on table/column names and data patterns
3. Identify business domains and classify assets appropriately
4. Determine data lineage relationships
5. Profile data characteristics and quality metrics

When analyzing table structures, consider:
- Column naming patterns to infer semantic meaning
- Data types to understand the nature of information
- Common prefixes (ref_, dim_, fact_, bronze_, silver_, gold_) for layer classification
- Foreign key patterns for lineage tracing

Always respond with a JSON object containing:
{
  "description": "Clear, business-friendly description of the asset",
  "business_context": "How this data is used in the business",
  "tags": ["array", "of", "relevant", "tags"],
  "domain": "finance|customer|operations|risk|marketing|reference",
  "suggested_owner": "Team most likely responsible"
}`;
  }

  async run(context?: AgentContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let issuesCreated = 0;
    const stats: DocumentaristResult = {
      assetsDiscovered: 0,
      assetsCreated: 0,
      assetsUpdated: 0,
      ownershipIssuesCreated: 0,
      profilesGenerated: 0,
      lineageRelationshipsFound: 0,
    };

    const runId = await this.startRun(context);

    try {
      await this.log('run_started', 'Documentarist agent started scanning for data assets');

      // Determine scan mode
      const mode = context?.parameters?.mode || 'full_scan';
      const targetSchema = context?.parameters?.targetSchema || 'meridian';
      const targetTable = context?.parameters?.targetTable;

      await this.log('scan_mode', `Scanning in ${mode} mode for schema: ${targetSchema}${targetTable ? `, table: ${targetTable}` : ''}`);

      // Step 1: Discover tables in the schema
      let tables = await this.discoverTables(targetSchema);

      // Filter to single table if specified
      if (targetTable) {
        tables = tables.filter(t => t.table_name === targetTable || t.table_name === targetTable.replace(`${targetSchema}.`, ''));
        if (tables.length === 0) {
          // Table not in known list, try to profile it directly
          tables = [{ table_name: targetTable.replace(`${targetSchema}.`, ''), table_type: 'table' }];
        }
      }

      await this.log('tables_discovered', `Found ${tables.length} tables/views to process`, {
        tables: tables.map(t => t.table_name),
      });

      stats.assetsDiscovered = tables.length;

      // Step 2: Get existing assets to check for new ones
      const { data: existingAssets } = await this.amygdalaClient
        .from('assets')
        .select('name, source_table');

      const existingNames = new Set((existingAssets || []).map(a => a.name));
      const existingSourceTables = new Set((existingAssets || []).map(a => a.source_table).filter(Boolean));

      // Step 3: Process each table
      const discoveredAssets: DiscoveredAsset[] = [];

      for (const table of tables) {
        try {
          // Get column information
          const columns = await this.getTableColumns(targetSchema, table.table_name);

          // Profile the table
          const profile = await this.profileTable(table.table_name, columns);
          stats.profilesGenerated++;

          // Determine if this is a new asset
          const sourceTable = `${targetSchema}.${table.table_name}`;
          const isNew = !existingNames.has(table.table_name) && !existingSourceTables.has(sourceTable);

          // Classify the asset
          const asset = await this.classifyAsset(table, columns, profile);
          asset.isNew = isNew;
          asset.source_table = sourceTable;
          asset.profile = profile;

          discoveredAssets.push(asset);

          await this.log(
            'asset_processed',
            `Processed ${table.table_name}: ${isNew ? 'NEW' : 'existing'}, layer=${asset.layer}`,
            { table: table.table_name, isNew, layer: asset.layer, rowCount: profile.row_count }
          );
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to process ${table.table_name}: ${errorMsg}`);
          await this.log('processing_error', `Error processing ${table.table_name}`, { error: errorMsg });
        }
      }

      // Step 4: Create/update assets in the catalog
      for (const asset of discoveredAssets) {
        try {
          if (asset.isNew) {
            await this.createAsset(asset);
            stats.assetsCreated++;

            // Create ownership issue for new assets without owner
            if (!asset.business_context) {
              await this.createOwnershipIssue(asset);
              stats.ownershipIssuesCreated++;
              issuesCreated++;
            }
          } else {
            // Optionally update existing assets with new profiling data
            await this.updateAssetProfile(asset);
            stats.assetsUpdated++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to save ${asset.name}: ${errorMsg}`);
        }
      }

      // Step 5: Analyze lineage relationships
      await this.log('lineage_analysis', 'Starting lineage analysis from pipelines and naming conventions');

      const lineageRelationships = await this.analyzeLineage(targetSchema, discoveredAssets.map(a => a.name));
      stats.lineageRelationshipsFound = lineageRelationships.length;

      // Update assets with lineage information
      for (const relationship of lineageRelationships) {
        try {
          await this.updateAssetLineage(relationship);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          await this.log('lineage_update_error', `Failed to update lineage: ${errorMsg}`);
        }
      }

      await this.log(
        'run_completed',
        `Documentarist completed: ${stats.assetsCreated} new, ${stats.assetsUpdated} updated, ${stats.ownershipIssuesCreated} ownership issues, ${stats.lineageRelationshipsFound} lineage relationships`,
        stats
      );

      await this.completeRun(runId, {
        stats,
        issuesCreated,
        discoveredAssets: discoveredAssets.map(a => ({
          name: a.name,
          layer: a.layer,
          isNew: a.isNew,
          rowCount: a.profile?.row_count,
        })),
      });

      return {
        success: true,
        runId,
        stats: stats as unknown as Record<string, number>,
        issuesCreated,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMsg);

      return {
        success: false,
        runId,
        stats: stats as unknown as Record<string, number>,
        issuesCreated,
        errors: [...errors, errorMsg],
        duration: Date.now() - startTime,
      };
    }
  }

  private async discoverTables(schema: string): Promise<TableInfo[]> {
    // Query information_schema for tables in the specified schema
    // Since we can't query information_schema directly via Supabase client,
    // we'll use a hardcoded list of known Meridian tables
    const knownTables: TableInfo[] = [
      // Reference tables
      { table_name: 'ref_branches', table_type: 'BASE TABLE' },
      { table_name: 'ref_products', table_type: 'BASE TABLE' },
      { table_name: 'ref_customer_segments', table_type: 'BASE TABLE' },
      // Bronze layer (raw data)
      { table_name: 'bronze_customers', table_type: 'BASE TABLE' },
      { table_name: 'bronze_transactions', table_type: 'BASE TABLE' },
      { table_name: 'bronze_loans', table_type: 'BASE TABLE' },
      { table_name: 'bronze_accounts', table_type: 'BASE TABLE' },
      // Silver layer (cleansed)
      { table_name: 'silver_customers', table_type: 'BASE TABLE' },
      { table_name: 'silver_transactions', table_type: 'BASE TABLE' },
      { table_name: 'silver_loans', table_type: 'BASE TABLE' },
      { table_name: 'silver_accounts', table_type: 'BASE TABLE' },
      // Gold layer (aggregated)
      { table_name: 'gold_daily_revenue', table_type: 'BASE TABLE' },
      { table_name: 'gold_branch_metrics', table_type: 'BASE TABLE' },
      { table_name: 'gold_loan_summary', table_type: 'BASE TABLE' },
      { table_name: 'gold_customer_360', table_type: 'BASE TABLE' },
    ];

    return knownTables;
  }

  private async getTableColumns(schema: string, tableName: string): Promise<ColumnInfo[]> {
    // Get a sample row to infer column structure
    const { data } = await this.meridianClient
      .from(tableName)
      .select('*')
      .limit(1);

    if (!data || data.length === 0) {
      return [];
    }

    const row = data[0];
    const columns: ColumnInfo[] = Object.entries(row).map(([key, value], index) => ({
      column_name: key,
      data_type: this.inferDataType(value),
      is_nullable: value === null ? 'YES' : 'NO',
      column_default: null,
      ordinal_position: index + 1,
    }));

    return columns;
  }

  private inferDataType(value: unknown): string {
    if (value === null) return 'unknown';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'numeric';
    }
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Check if it looks like a date
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'timestamp';
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
      return 'text';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'jsonb';
    return 'unknown';
  }

  private async profileTable(tableName: string, columns: ColumnInfo[]): Promise<{
    row_count: number;
    column_count: number;
    columns: ColumnProfile[];
  }> {
    // Get row count
    const { count } = await this.meridianClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const rowCount = count || 0;
    const columnProfiles: ColumnProfile[] = [];

    // Profile each column (limited to avoid performance issues)
    for (const col of columns.slice(0, 20)) {
      try {
        const profile = await this.profileColumn(tableName, col, rowCount);
        columnProfiles.push(profile);
      } catch {
        // Skip columns that fail to profile
        columnProfiles.push({
          name: col.column_name,
          data_type: col.data_type,
          null_count: 0,
          null_percentage: 0,
          distinct_count: 0,
          distinct_percentage: 0,
          top_values: [],
        });
      }
    }

    return {
      row_count: rowCount,
      column_count: columns.length,
      columns: columnProfiles,
    };
  }

  private async profileColumn(
    tableName: string,
    column: ColumnInfo,
    totalRows: number
  ): Promise<ColumnProfile> {
    // Count nulls
    const { count: nullCount } = await this.meridianClient
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .is(column.column_name, null);

    // Get distinct count (approximate via sampling)
    const { data: sampleData } = await this.meridianClient
      .from(tableName)
      .select(column.column_name)
      .limit(1000);

    const values = (sampleData || []).map((row: Record<string, unknown>) => row[column.column_name]);
    const uniqueValues = new Set(values.filter(v => v !== null));
    const distinctCount = uniqueValues.size;

    // Get top values
    const valueCounts: Record<string, number> = {};
    values.forEach((v: unknown) => {
      if (v !== null) {
        const key = String(v);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }
    });

    const topValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    // Calculate min/max/mean for numeric columns
    let minValue: unknown = undefined;
    let maxValue: unknown = undefined;
    let meanValue: number | undefined = undefined;

    if (column.data_type === 'integer' || column.data_type === 'numeric') {
      const numericValues = values.filter((v: unknown): v is number => typeof v === 'number');
      if (numericValues.length > 0) {
        minValue = Math.min(...numericValues);
        maxValue = Math.max(...numericValues);
        meanValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
    }

    // Infer semantic type
    const semanticType = this.inferSemanticType(column.column_name, column.data_type, topValues);

    return {
      name: column.column_name,
      data_type: column.data_type,
      inferred_semantic_type: semanticType,
      null_count: nullCount || 0,
      null_percentage: totalRows > 0 ? ((nullCount || 0) / totalRows) * 100 : 0,
      distinct_count: distinctCount,
      distinct_percentage: totalRows > 0 ? (distinctCount / Math.min(totalRows, 1000)) * 100 : 0,
      min_value: minValue,
      max_value: maxValue,
      mean_value: meanValue,
      top_values: topValues,
    };
  }

  private inferSemanticType(
    columnName: string,
    dataType: string,
    _topValues: Array<{ value: string; count: number }>
  ): string {
    const nameLower = columnName.toLowerCase();

    // Common patterns
    if (nameLower.includes('email')) return 'email';
    if (nameLower.includes('phone')) return 'phone';
    if (nameLower.includes('address')) return 'address';
    if (nameLower.includes('city')) return 'city';
    if (nameLower.includes('state')) return 'state';
    if (nameLower.includes('zip') || nameLower.includes('postal')) return 'postal_code';
    if (nameLower.includes('country')) return 'country';
    if (nameLower.includes('date') || nameLower.includes('_at')) return 'datetime';
    if (nameLower.includes('amount') || nameLower.includes('price') || nameLower.includes('revenue')) return 'currency';
    if (nameLower.includes('rate') || nameLower.includes('ratio') || nameLower.includes('percent')) return 'percentage';
    if (nameLower.endsWith('_id')) return 'identifier';
    if (nameLower.includes('name')) return 'name';
    if (nameLower.includes('description')) return 'description';
    if (nameLower.includes('status')) return 'status';
    if (nameLower.includes('type')) return 'category';
    if (nameLower.includes('ssn') || nameLower.includes('social_security')) return 'ssn';
    if (nameLower.includes('credit_card') || nameLower.includes('card_number')) return 'credit_card';
    if (nameLower.includes('password') || nameLower.includes('secret')) return 'password';
    if (nameLower.includes('dob') || nameLower.includes('birth')) return 'date_of_birth';
    if (nameLower.includes('salary') || nameLower.includes('income')) return 'salary';
    if (dataType === 'boolean') return 'boolean';
    if (dataType === 'integer' || dataType === 'numeric') return 'numeric';

    return 'text';
  }

  /**
   * Detects sensitive columns based on semantic type and naming patterns
   */
  private detectSensitiveColumns(columns: ColumnProfile[]): string[] {
    const sensitiveTypes = ['email', 'phone', 'ssn', 'credit_card', 'password', 'address', 'date_of_birth', 'salary'];
    const sensitivePatterns = ['email', 'phone', 'ssn', 'social', 'credit', 'card', 'password', 'secret', 'dob', 'birth', 'salary', 'income', 'address'];

    return columns
      .filter(col => {
        // Check semantic type
        if (sensitiveTypes.includes(col.inferred_semantic_type || '')) return true;
        // Check column name patterns
        const nameLower = col.name.toLowerCase();
        return sensitivePatterns.some(pattern => nameLower.includes(pattern));
      })
      .map(col => col.name);
  }

  /**
   * Generates business term mappings based on column names and table context
   */
  private generateBusinessTerms(tableName: string, columns: ColumnProfile[]): Record<string, string> {
    const terms: Record<string, string> = {};
    const nameLower = tableName.toLowerCase();

    // Table-level business terms
    if (nameLower.includes('customer')) {
      terms['Customer'] = 'An individual or organization that has a business relationship with Meridian Bank';
    }
    if (nameLower.includes('transaction')) {
      terms['Transaction'] = 'A financial event representing money movement between accounts';
    }
    if (nameLower.includes('loan')) {
      terms['Loan'] = 'A financial product where the bank lends money to a customer';
    }
    if (nameLower.includes('account')) {
      terms['Account'] = 'A financial arrangement where a customer holds money with the bank';
    }
    if (nameLower.includes('branch')) {
      terms['Branch'] = 'A physical location where banking services are provided';
    }
    if (nameLower.includes('revenue')) {
      terms['Revenue'] = 'Income generated from banking operations and services';
    }

    // Column-level business terms
    for (const col of columns) {
      const colLower = col.name.toLowerCase();

      if (colLower.includes('ltv') || colLower.includes('loan_to_value')) {
        terms['LTV Ratio'] = 'Loan-to-Value ratio: The ratio of the loan amount to the value of the collateral';
      }
      if (colLower.includes('aum') || colLower.includes('assets_under')) {
        terms['AUM'] = 'Assets Under Management: Total value of assets managed for customers';
      }
      if (colLower.includes('kyc')) {
        terms['KYC'] = 'Know Your Customer: Regulatory process to verify customer identity';
      }
      if (colLower.includes('aml')) {
        terms['AML'] = 'Anti-Money Laundering: Processes to detect and prevent money laundering';
      }
      if (colLower === 'customer_id') {
        terms['Customer ID'] = 'Unique identifier for a customer in the banking system';
      }
      if (colLower === 'branch_id') {
        terms['Branch ID'] = 'Unique identifier for a bank branch location';
      }
      if (colLower.includes('segment')) {
        terms['Customer Segment'] = 'Classification of customers based on value, behavior, or demographics';
      }
    }

    return terms;
  }

  /**
   * Determines data classification based on sensitive columns and table type
   */
  private determineDataClassification(
    sensitiveColumns: string[],
    tableName: string
  ): 'public' | 'internal' | 'confidential' | 'restricted' {
    // Restricted: Contains highly sensitive PII
    const restrictedPatterns = ['ssn', 'social_security', 'credit_card', 'password'];
    if (sensitiveColumns.some(col => restrictedPatterns.some(p => col.toLowerCase().includes(p)))) {
      return 'restricted';
    }

    // Confidential: Contains PII
    if (sensitiveColumns.length > 0) {
      return 'confidential';
    }

    // Internal: Business data without PII
    const nameLower = tableName.toLowerCase();
    if (nameLower.includes('gold') || nameLower.includes('silver')) {
      return 'internal';
    }

    // Public: Reference data
    if (nameLower.startsWith('ref_') || nameLower.startsWith('dim_')) {
      return 'public';
    }

    return 'internal';
  }

  private async classifyAsset(
    table: TableInfo,
    columns: ColumnInfo[],
    profile: { row_count: number; column_count: number; columns: ColumnProfile[] }
  ): Promise<DiscoveredAsset> {
    const tableName = table.table_name;

    // Determine layer from naming convention
    let layer: DataLayer = 'silver';
    if (tableName.startsWith('raw_') || tableName.startsWith('bronze_')) {
      layer = 'bronze';
    } else if (tableName.startsWith('silver_')) {
      layer = 'silver';
    } else if (tableName.startsWith('gold_')) {
      layer = 'gold';
    } else if (tableName.startsWith('ref_') || tableName.startsWith('dim_')) {
      layer = 'silver'; // Reference data typically in silver
    }

    // Determine asset type
    const assetType: AssetType = table.table_type === 'VIEW' ? 'view' : 'table';

    // Generate tags from column names and patterns
    const tags = this.generateTags(tableName, columns);

    // Use Claude to generate description and business context
    let description: string | undefined;
    let businessContext: string | undefined;

    try {
      const analysis = await this.analyzeWithClaude(
        'Analyze this table structure and provide a description:',
        {
          table_name: tableName,
          layer,
          row_count: profile.row_count,
          columns: columns.map(c => ({
            name: c.column_name,
            type: c.data_type,
          })),
          sample_profiles: profile.columns.slice(0, 5).map(c => ({
            name: c.name,
            semantic_type: c.inferred_semantic_type,
            null_percentage: c.null_percentage?.toFixed(1),
            distinct_count: c.distinct_count,
          })),
        }
      );

      // Parse Claude's response
      try {
        const parsed = JSON.parse(analysis);
        description = parsed.description;
        businessContext = parsed.business_context;
        if (parsed.tags) {
          tags.push(...parsed.tags.filter((t: string) => !tags.includes(t)));
        }
      } catch {
        // Use analysis as description if not JSON
        description = analysis.slice(0, 500);
      }
    } catch {
      // Generate fallback description
      description = this.generateFallbackDescription(tableName, layer, profile);
    }

    return {
      name: tableName,
      asset_type: assetType,
      layer,
      description,
      business_context: businessContext,
      tags: tags.slice(0, 10), // Limit tags
      source_table: '',
      isNew: false,
    };
  }

  private generateTags(tableName: string, columns: ColumnInfo[]): string[] {
    const tags: string[] = [];

    // Tags from table name
    const parts = tableName.split('_').filter(p => p.length > 2);
    tags.push(...parts.filter(p => !['ref', 'silver', 'gold', 'bronze', 'raw'].includes(p)));

    // Tags from common column patterns
    const columnNames = columns.map(c => c.column_name.toLowerCase());

    if (columnNames.some(n => n.includes('customer'))) tags.push('customer');
    if (columnNames.some(n => n.includes('transaction'))) tags.push('transactions');
    if (columnNames.some(n => n.includes('revenue') || n.includes('amount'))) tags.push('financial');
    if (columnNames.some(n => n.includes('branch'))) tags.push('branch');
    if (columnNames.some(n => n.includes('loan'))) tags.push('loans');
    if (columnNames.some(n => n.includes('email') || n.includes('phone'))) tags.push('pii');
    if (columnNames.some(n => n.includes('date') || n.includes('_at'))) tags.push('time-series');

    return [...new Set(tags)];
  }

  private generateFallbackDescription(
    tableName: string,
    layer: DataLayer,
    profile: { row_count: number; column_count: number }
  ): string {
    const layerDesc: Record<DataLayer, string> = {
      raw: 'Raw source data',
      bronze: 'Raw/bronze layer data',
      silver: 'Cleansed and standardized data',
      gold: 'Aggregated and curated data',
      consumer: 'Consumer-facing data product',
    };

    return `${layerDesc[layer]} table containing ${profile.row_count.toLocaleString()} records across ${profile.column_count} columns.`;
  }

  private async createAsset(asset: DiscoveredAsset): Promise<void> {
    // Determine fitness status based on profile
    let fitnessStatus: FitnessStatus = 'green';
    if (asset.profile) {
      const avgNullRate = asset.profile.columns.reduce((sum, c) => sum + (c.null_percentage || 0), 0) /
        Math.max(asset.profile.columns.length, 1);
      if (avgNullRate > 20) fitnessStatus = 'red';
      else if (avgNullRate > 10) fitnessStatus = 'amber';
    }

    // Calculate initial quality score
    const qualityScore = fitnessStatus === 'green' ? 85 : fitnessStatus === 'amber' ? 65 : 45;

    // Detect sensitive columns
    const sensitiveColumns = asset.profile
      ? this.detectSensitiveColumns(asset.profile.columns)
      : [];

    // Generate business terms
    const businessTerms = asset.profile
      ? this.generateBusinessTerms(asset.name, asset.profile.columns)
      : {};

    // Determine data classification
    const dataClassification = this.determineDataClassification(sensitiveColumns, asset.name);

    // Build metadata object
    const metadata = {
      sensitive_columns: sensitiveColumns,
      business_terms: businessTerms,
      data_classification: dataClassification,
      row_count: asset.profile?.row_count,
      column_count: asset.profile?.column_count,
      refresh_schedule: asset.layer === 'gold' ? 'daily' : asset.layer === 'silver' ? 'hourly' : 'real-time',
      last_refresh: new Date().toISOString(),
    };

    const { data: insertedAsset, error } = await this.amygdalaClient.from('assets').insert({
      name: asset.name,
      asset_type: asset.asset_type,
      layer: asset.layer,
      description: asset.description,
      business_context: asset.business_context,
      tags: asset.tags,
      source_table: asset.source_table,
      quality_score: qualityScore,
      fitness_status: fitnessStatus,
      trust_score_stars: fitnessStatus === 'green' ? 4 : fitnessStatus === 'amber' ? 3 : 2,
      trust_score_raw: qualityScore / 100,
      metadata: metadata,
      created_by: this.name,
    }).select('id').single();

    if (error) {
      throw new Error(`Failed to create asset: ${error.message}`);
    }

    // Store column profiles in column_profiles table
    if (insertedAsset && asset.profile && asset.profile.columns.length > 0) {
      const columnProfileRecords = asset.profile.columns.map(col => ({
        asset_id: insertedAsset.id,
        column_name: col.name,
        data_type: col.data_type,
        inferred_semantic_type: col.inferred_semantic_type,
        null_count: col.null_count,
        null_percentage: col.null_percentage,
        distinct_count: col.distinct_count,
        distinct_percentage: col.distinct_percentage,
        min_value: col.min_value !== undefined ? JSON.stringify(col.min_value) : null,
        max_value: col.max_value !== undefined ? JSON.stringify(col.max_value) : null,
        mean_value: col.mean_value,
        top_values: col.top_values || [],
      }));

      const { error: profileError } = await this.amygdalaClient
        .from('column_profiles')
        .insert(columnProfileRecords);

      if (profileError) {
        await this.log('profile_insert_warning', `Could not insert column profiles: ${profileError.message}`);
      }
    }

    await this.log('asset_created', `Created new asset: ${asset.name}`, {
      layer: asset.layer,
      fitnessStatus,
      qualityScore,
      sensitiveColumns: sensitiveColumns.length,
      businessTerms: Object.keys(businessTerms).length,
      dataClassification,
    });
  }

  private async updateAssetProfile(asset: DiscoveredAsset): Promise<void> {
    // Update profile-related fields and metadata
    if (!asset.profile) return;

    // Detect sensitive columns
    const sensitiveColumns = this.detectSensitiveColumns(asset.profile.columns);

    // Generate business terms
    const businessTerms = this.generateBusinessTerms(asset.name, asset.profile.columns);

    // Determine data classification
    const dataClassification = this.determineDataClassification(sensitiveColumns, asset.name);

    // Get the existing asset
    const { data: existingAsset } = await this.amygdalaClient
      .from('assets')
      .select('id, metadata')
      .eq('name', asset.name)
      .single();

    if (!existingAsset) return;

    // Merge new metadata with existing
    const existingMetadata = existingAsset.metadata || {};
    const updatedMetadata = {
      ...existingMetadata,
      sensitive_columns: sensitiveColumns,
      business_terms: { ...existingMetadata.business_terms, ...businessTerms },
      data_classification: dataClassification,
      row_count: asset.profile.row_count,
      column_count: asset.profile.column_count,
      last_refresh: new Date().toISOString(),
    };

    const { error } = await this.amygdalaClient
      .from('assets')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('name', asset.name);

    if (error) {
      await this.log('update_skipped', `Could not update ${asset.name}: ${error.message}`);
      return;
    }

    // Update column profiles - delete old ones first, then insert new
    const { error: deleteError } = await this.amygdalaClient
      .from('column_profiles')
      .delete()
      .eq('asset_id', existingAsset.id);

    if (deleteError) {
      await this.log('profile_delete_warning', `Could not delete old profiles for ${asset.name}: ${deleteError.message}`);
    }

    if (asset.profile.columns.length > 0) {
      const columnProfileRecords = asset.profile.columns.map(col => ({
        asset_id: existingAsset.id,
        column_name: col.name,
        data_type: col.data_type,
        inferred_semantic_type: col.inferred_semantic_type,
        null_count: col.null_count || 0,
        null_percentage: col.null_percentage || 0,
        distinct_count: col.distinct_count || 0,
        distinct_percentage: col.distinct_percentage || 0,
        min_value: col.min_value !== undefined ? String(col.min_value).slice(0, 255) : null,
        max_value: col.max_value !== undefined ? String(col.max_value).slice(0, 255) : null,
        mean_value: col.mean_value || null,
        top_values: col.top_values || [],
        profiled_at: new Date().toISOString(),
      }));

      const { error: insertError } = await this.amygdalaClient
        .from('column_profiles')
        .insert(columnProfileRecords);

      if (insertError) {
        await this.log('profile_insert_error', `Could not insert column profiles for ${asset.name}: ${insertError.message}`, {
          error: insertError,
          columnCount: columnProfileRecords.length,
        });
      } else {
        await this.log('profiles_inserted', `Inserted ${columnProfileRecords.length} column profiles for ${asset.name}`);
      }
    }

    await this.log('asset_updated', `Updated asset profile: ${asset.name}`, {
      sensitiveColumns: sensitiveColumns.length,
      businessTerms: Object.keys(businessTerms).length,
      columnCount: asset.profile.columns.length,
    });
  }

  private async createOwnershipIssue(asset: DiscoveredAsset): Promise<void> {
    const issue: DetectedIssue = {
      title: `Missing ownership for ${asset.name}`,
      description: `The data asset "${asset.name}" in the ${asset.layer} layer was discovered but has no assigned owner or steward. ` +
        `Please assign appropriate ownership to ensure accountability and governance.`,
      severity: asset.layer === 'gold' || asset.layer === 'consumer' ? 'high' : 'medium',
      issueType: 'ownership_missing',
      affectedAssets: [asset.name],
      metadata: {
        layer: asset.layer,
        assetType: asset.asset_type,
        rowCount: asset.profile?.row_count,
        discoveredBy: this.name,
      },
    };

    await this.createIssue(issue);
  }

  // ========== LINEAGE ANALYSIS METHODS ==========

  private async analyzeLineage(schema: string, assetNames: string[]): Promise<LineageRelationship[]> {
    const relationships: LineageRelationship[] = [];

    // 1. Get pipeline definitions from Meridian
    const pipelines = await this.getPipelines();
    await this.log('pipelines_found', `Found ${pipelines.length} pipeline definitions`, {
      pipelines: pipelines.map(p => p.name),
    });

    // 2. Create relationships from pipelines
    for (const pipeline of pipelines) {
      if (pipeline.source_table && pipeline.target_table) {
        const sourceTable = pipeline.source_table.replace(`${schema}.`, '');
        const targetTable = pipeline.target_table.replace(`${schema}.`, '');

        relationships.push({
          sourceAsset: sourceTable,
          targetAsset: targetTable,
          relationshipType: 'pipeline',
          pipelineName: pipeline.name,
          confidence: 'high',
        });

        await this.log('pipeline_relationship', `Pipeline "${pipeline.name}": ${sourceTable} → ${targetTable}`);
      }
    }

    // 3. Infer additional relationships from naming conventions
    const inferredRelationships = this.inferLineageFromNaming(assetNames);
    relationships.push(...inferredRelationships);

    await this.log('inferred_relationships', `Inferred ${inferredRelationships.length} relationships from naming conventions`);

    // 4. Store pipeline metadata for UI
    await this.storePipelineMetadata(pipelines);

    return relationships;
  }

  private async getPipelines(): Promise<PipelineInfo[]> {
    try {
      const { data, error } = await this.meridianClient
        .from('pipelines')
        .select('*');

      if (error) {
        await this.log('pipeline_fetch_error', `Failed to fetch pipelines: ${error.message}`);
        return this.getDefaultPipelines();
      }

      return (data || []) as PipelineInfo[];
    } catch {
      // Return hardcoded pipelines if table doesn't exist
      return this.getDefaultPipelines();
    }
  }

  private getDefaultPipelines(): PipelineInfo[] {
    // Default pipeline definitions based on Meridian data flow
    return [
      {
        id: 'pl-001',
        name: 'bronze_to_silver_customers',
        description: 'Cleanses customer data: validates emails, normalizes phones, calculates age',
        source_table: 'meridian.bronze_customers',
        target_table: 'meridian.silver_customers',
        schedule: 'hourly',
        is_active: true,
      },
      {
        id: 'pl-002',
        name: 'bronze_to_silver_transactions',
        description: 'Enriches transactions with branch details and validates data',
        source_table: 'meridian.bronze_transactions',
        target_table: 'meridian.silver_transactions',
        schedule: 'hourly',
        is_active: true,
      },
      {
        id: 'pl-003',
        name: 'bronze_to_silver_loans',
        description: 'Enriches loans with customer and product details, calculates LTV ratio',
        source_table: 'meridian.bronze_loans',
        target_table: 'meridian.silver_loans',
        schedule: 'daily',
        is_active: true,
      },
      {
        id: 'pl-004',
        name: 'silver_to_gold_daily_revenue',
        description: 'Aggregates daily revenue from transactions',
        source_table: 'meridian.silver_transactions',
        target_table: 'meridian.gold_daily_revenue',
        schedule: 'daily at 01:00',
        is_active: true,
      },
      {
        id: 'pl-005',
        name: 'silver_to_gold_branch_metrics',
        description: 'Calculates branch-level metrics from transactions',
        source_table: 'meridian.silver_transactions',
        target_table: 'meridian.gold_branch_metrics',
        schedule: 'daily at 01:30',
        is_active: true,
      },
      {
        id: 'pl-006',
        name: 'silver_to_gold_loan_summary',
        description: 'Aggregates loan portfolio metrics',
        source_table: 'meridian.silver_loans',
        target_table: 'meridian.gold_loan_summary',
        schedule: 'daily at 02:00',
        is_active: true,
      },
      {
        id: 'pl-007',
        name: 'silver_to_gold_customer_360',
        description: 'Creates customer 360 view combining accounts, loans, and transactions',
        source_table: 'meridian.silver_customers',
        target_table: 'meridian.gold_customer_360',
        schedule: 'daily at 03:00',
        is_active: true,
      },
    ];
  }

  private inferLineageFromNaming(assetNames: string[]): LineageRelationship[] {
    const relationships: LineageRelationship[] = [];

    // Map of layer prefixes and their likely upstream sources
    const layerHierarchy = [
      { pattern: 'bronze_', upstreamPrefix: null, layer: 'bronze' },
      { pattern: 'silver_', upstreamPrefix: 'bronze_', layer: 'silver' },
      { pattern: 'gold_', upstreamPrefix: 'silver_', layer: 'gold' },
    ];

    // Common entity mappings (e.g., gold_customer_360 comes from silver_customers)
    const entityMappings: Record<string, string[]> = {
      'gold_daily_revenue': ['silver_transactions'],
      'gold_branch_metrics': ['silver_transactions', 'ref_branches'],
      'gold_loan_summary': ['silver_loans'],
      'gold_customer_360': ['silver_customers', 'silver_accounts', 'silver_loans', 'silver_transactions'],
    };

    for (const assetName of assetNames) {
      // Check direct entity mappings first
      const directMappings = entityMappings[assetName];
      if (directMappings) {
        for (const upstream of directMappings) {
          if (assetNames.includes(upstream)) {
            relationships.push({
              sourceAsset: upstream,
              targetAsset: assetName,
              relationshipType: 'inferred',
              confidence: 'high',
            });
          }
        }
        continue;
      }

      // Infer from naming patterns
      for (const { pattern, upstreamPrefix } of layerHierarchy) {
        if (assetName.startsWith(pattern) && upstreamPrefix) {
          const entityName = assetName.replace(pattern, '');
          const potentialUpstream = `${upstreamPrefix}${entityName}`;

          if (assetNames.includes(potentialUpstream)) {
            relationships.push({
              sourceAsset: potentialUpstream,
              targetAsset: assetName,
              relationshipType: 'inferred',
              confidence: 'medium',
            });
          }
        }
      }

      // Check for reference table relationships (ref_ prefix)
      if (assetName.startsWith('ref_')) {
        // Reference tables are typically upstream of silver/gold tables
        const entityName = assetName.replace('ref_', '');
        for (const otherAsset of assetNames) {
          if (otherAsset.includes(entityName) && !otherAsset.startsWith('ref_')) {
            relationships.push({
              sourceAsset: assetName,
              targetAsset: otherAsset,
              relationshipType: 'inferred',
              confidence: 'low',
            });
          }
        }
      }
    }

    return relationships;
  }

  private async updateAssetLineage(relationship: LineageRelationship): Promise<void> {
    const { sourceAsset, targetAsset } = relationship;

    // Update the source asset's downstream_assets
    const { data: sourceData } = await this.amygdalaClient
      .from('assets')
      .select('downstream_assets')
      .eq('name', sourceAsset)
      .single();

    if (sourceData) {
      const currentDownstream = sourceData.downstream_assets || [];
      if (!currentDownstream.includes(targetAsset)) {
        await this.amygdalaClient
          .from('assets')
          .update({
            downstream_assets: [...currentDownstream, targetAsset],
            updated_at: new Date().toISOString(),
          })
          .eq('name', sourceAsset);
      }
    }

    // Update the target asset's upstream_assets
    const { data: targetData } = await this.amygdalaClient
      .from('assets')
      .select('upstream_assets')
      .eq('name', targetAsset)
      .single();

    if (targetData) {
      const currentUpstream = targetData.upstream_assets || [];
      if (!currentUpstream.includes(sourceAsset)) {
        await this.amygdalaClient
          .from('assets')
          .update({
            upstream_assets: [...currentUpstream, sourceAsset],
            updated_at: new Date().toISOString(),
          })
          .eq('name', targetAsset);
      }
    }
  }

  private async storePipelineMetadata(pipelines: PipelineInfo[]): Promise<void> {
    // Store pipeline metadata in assets for UI display
    for (const pipeline of pipelines) {
      const targetTable = pipeline.target_table.replace('meridian.', '');

      await this.amygdalaClient
        .from('assets')
        .update({
          metadata: {
            pipeline: {
              name: pipeline.name,
              description: pipeline.description,
              schedule: pipeline.schedule,
              is_active: pipeline.is_active,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('name', targetTable);
    }
  }
}

// Singleton instance
let documentaristInstance: DocumentaristAgent | null = null;

export function getDocumentaristAgent(): DocumentaristAgent {
  if (!documentaristInstance) {
    documentaristInstance = new DocumentaristAgent();
  }
  return documentaristInstance;
}
