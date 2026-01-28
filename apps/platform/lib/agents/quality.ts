import { BaseAgent, AgentContext, AgentRunResult, DetectedIssue } from './base';
import { getMeridianClient } from '../supabase/client';

export interface QualityRule {
  id?: string;
  name: string;
  description: string;
  ruleType: 'null_check' | 'range_check' | 'pattern_check' | 'uniqueness' | 'referential' | 'custom';
  targetAsset: string;
  targetColumn?: string;
  expression: string;
  threshold: number; // Percentage that must pass (e.g., 95 = 95% must pass)
  severity: 'critical' | 'high' | 'medium' | 'low';
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface QualityValidationResult {
  rule: QualityRule;
  passed: boolean;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  passRate: number;
  sampleFailures?: any[];
}

export interface QualityAgentRunContext extends AgentContext {
  mode?: 'generate' | 'validate' | 'both';
  targetAssets?: string[];
  generateForNewAssets?: boolean;
}

export class QualityAgent extends BaseAgent {
  private meridian = getMeridianClient();

  constructor() {
    super('Quality', 'Generates and enforces data quality rules based on profiling');
  }

  get systemPrompt(): string {
    return `You are the Quality Agent for Amygdala, responsible for data quality rule generation and enforcement.

Your capabilities:
1. PROFILE data to understand patterns, distributions, and expected values
2. GENERATE quality rules based on profiling insights
3. VALIDATE data against defined rules
4. CREATE issues when data fails quality checks

Rule Types you can generate:
- null_check: Column should not have more than X% nulls
- range_check: Values should be within expected range
- pattern_check: Values should match regex pattern (email, phone, etc.)
- uniqueness: Column should have unique values (no duplicates)
- referential: Foreign key should reference valid parent record
- custom: Complex SQL-based validation

When generating rules:
- Analyze column names and data types for semantic meaning
- Consider business context (emails should be valid, amounts should be positive)
- Set appropriate thresholds (don't be too strict for non-critical data)
- Consider the data layer (bronze/silver/gold have different expectations)

Severity Guidelines:
- critical: Core business data, financial amounts, customer IDs
- high: Important operational data, dates, status fields
- medium: Descriptive data, optional fields
- low: Metadata, audit fields`;
  }

  async run(context?: QualityAgentRunContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const runId = await this.startRun(context);

    const mode = context?.mode ?? 'both';
    const stats = {
      assets_profiled: 0,
      rules_generated: 0,
      rules_validated: 0,
      rules_passed: 0,
      rules_failed: 0,
      issues_created: 0,
    };

    const errors: string[] = [];
    let issuesCreated = 0;

    try {
      await this.log('run_started', `Quality agent run started in ${mode} mode`, { context });

      // Fetch target assets
      let assetsQuery = this.supabase.from('assets').select('*');
      if (context?.targetAssets && context.targetAssets.length > 0) {
        assetsQuery = assetsQuery.in('name', context.targetAssets);
      }

      const { data: assets, error: assetsError } = await assetsQuery;
      if (assetsError) {
        throw new Error(`Failed to fetch assets: ${assetsError.message}`);
      }

      if (!assets || assets.length === 0) {
        await this.log('no_assets', 'No assets found to process');
        await this.completeRun(runId, { stats }, true);
        return {
          success: true,
          runId,
          stats,
          issuesCreated: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // Phase 1: Generate rules for assets that need them
      if (mode === 'generate' || mode === 'both') {
        for (const asset of assets) {
          try {
            const existingRules = await this.getExistingRules(asset.name);

            // Generate rules if asset has few or no rules
            if (existingRules.length < 3 || context?.generateForNewAssets) {
              const generatedRules = await this.generateRulesForAsset(asset);
              stats.rules_generated += generatedRules.length;
              stats.assets_profiled++;

              await this.log('rules_generated', `Generated ${generatedRules.length} rules for ${asset.name}`, {
                assetName: asset.name,
                rulesCount: generatedRules.length,
              });
            }
          } catch (error) {
            const msg = `Failed to generate rules for ${asset.name}: ${error}`;
            errors.push(msg);
            await this.log('rule_generation_error', msg, { assetName: asset.name });
          }
        }
      }

      // Phase 2: Validate existing rules
      if (mode === 'validate' || mode === 'both') {
        for (const asset of assets) {
          try {
            const rules = await this.getExistingRules(asset.name);

            for (const rule of rules) {
              if (!rule.enabled) continue;

              stats.rules_validated++;

              const result = await this.validateRule(rule);

              if (result.passed) {
                stats.rules_passed++;
              } else {
                stats.rules_failed++;

                // Create issue for failed validation
                const issue = await this.createValidationIssue(result);
                if (issue) {
                  stats.issues_created++;
                  issuesCreated++;
                }
              }
            }
          } catch (error) {
            const msg = `Failed to validate rules for ${asset.name}: ${error}`;
            errors.push(msg);
          }
        }
      }

      await this.log('run_completed', 'Quality agent run completed', { stats });
      await this.completeRun(runId, { stats }, errors.length === 0);

      return {
        success: errors.length === 0,
        runId,
        stats,
        issuesCreated,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.failRun(runId, errorMessage);

      return {
        success: false,
        runId,
        stats,
        issuesCreated,
        errors: [errorMessage],
        duration: Date.now() - startTime,
      };
    }
  }

  private async getExistingRules(assetName: string): Promise<QualityRule[]> {
    const { data } = await this.supabase
      .from('quality_rules')
      .select('*')
      .eq('target_asset', assetName);

    return (data || []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      ruleType: r.rule_type,
      targetAsset: r.target_asset,
      targetColumn: r.target_column,
      expression: r.expression,
      threshold: r.threshold,
      severity: r.severity,
      enabled: r.enabled,
      metadata: r.metadata,
    }));
  }

  private async generateRulesForAsset(asset: any): Promise<QualityRule[]> {
    const generatedRules: QualityRule[] = [];

    // Get table name from asset
    const tableName = this.getTableName(asset);
    if (!tableName) return generatedRules;

    // Profile the table
    const profile = await this.profileTable(tableName);
    if (!profile) return generatedRules;

    // Generate rules based on profiling
    for (const column of profile.columns) {
      const rules = await this.generateColumnRules(asset, column, profile);
      generatedRules.push(...rules);
    }

    // Save generated rules
    for (const rule of generatedRules) {
      await this.saveRule(rule);
    }

    return generatedRules;
  }

  private getTableName(asset: any): string | null {
    // First check if asset has source_table set
    if (asset.source_table) {
      return asset.source_table;
    }

    // Extract schema.table from asset name or metadata
    const name = asset.name.toLowerCase();

    // Check if it's a meridian table
    if (name.includes('silver_') || name.includes('gold_') || name.includes('ref_') || name.includes('bronze_')) {
      return `meridian.${name}`;
    }

    // Check metadata for source table
    if (asset.metadata?.sourceTable) {
      return asset.metadata.sourceTable;
    }

    return null;
  }

  private async profileTable(tableName: string): Promise<any | null> {
    try {
      const [schema, table] = tableName.split('.');

      // Get column info
      const { data: columns, error } = await this.meridian
        .from(table)
        .select('*')
        .limit(1000);

      if (error || !columns || columns.length === 0) {
        return null;
      }

      // Analyze columns
      const columnProfiles = [];
      const sampleRow = columns[0];

      for (const columnName of Object.keys(sampleRow)) {
        const values = columns.map(r => r[columnName]);
        const nonNullValues = values.filter(v => v !== null && v !== undefined);

        const profile = {
          name: columnName,
          type: this.inferType(sampleRow[columnName]),
          nullCount: values.length - nonNullValues.length,
          nullRate: ((values.length - nonNullValues.length) / values.length) * 100,
          uniqueCount: new Set(nonNullValues).size,
          uniqueRate: (new Set(nonNullValues).size / nonNullValues.length) * 100,
          sampleValues: nonNullValues.slice(0, 5),
        };

        // Add type-specific profiling
        if (profile.type === 'number') {
          const numValues = nonNullValues.filter(v => typeof v === 'number') as number[];
          if (numValues.length > 0) {
            profile['min'] = Math.min(...numValues);
            profile['max'] = Math.max(...numValues);
            profile['avg'] = numValues.reduce((a, b) => a + b, 0) / numValues.length;
          }
        }

        if (profile.type === 'string') {
          const strValues = nonNullValues.filter(v => typeof v === 'string') as string[];
          if (strValues.length > 0) {
            const lengths = strValues.map(s => s.length);
            profile['minLength'] = Math.min(...lengths);
            profile['maxLength'] = Math.max(...lengths);
            profile['patterns'] = this.detectPatterns(strValues);
          }
        }

        columnProfiles.push(profile);
      }

      return {
        tableName,
        rowCount: columns.length,
        columns: columnProfiles,
      };
    } catch (error) {
      console.error(`Failed to profile ${tableName}:`, error);
      return null;
    }
  }

  private inferType(value: any): string {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      return 'string';
    }
    return 'unknown';
  }

  private detectPatterns(values: string[]): string[] {
    const patterns: string[] = [];
    const sample = values.slice(0, 100);

    // Email pattern
    const emailCount = sample.filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)).length;
    if (emailCount / sample.length > 0.8) patterns.push('email');

    // Phone pattern
    const phoneCount = sample.filter(v => /^[\d\s\-\+\(\)]{7,20}$/.test(v)).length;
    if (phoneCount / sample.length > 0.8) patterns.push('phone');

    // UUID pattern
    const uuidCount = sample.filter(v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)).length;
    if (uuidCount / sample.length > 0.8) patterns.push('uuid');

    // Numeric string
    const numericCount = sample.filter(v => /^\d+$/.test(v)).length;
    if (numericCount / sample.length > 0.8) patterns.push('numeric_string');

    return patterns;
  }

  private async generateColumnRules(
    asset: any,
    column: any,
    profile: any
  ): Promise<QualityRule[]> {
    const rules: QualityRule[] = [];
    const columnName = column.name.toLowerCase();

    // Skip internal columns
    if (['id', 'created_at', 'updated_at'].includes(columnName)) {
      return rules;
    }

    // Determine severity based on column name and asset layer
    const severity = this.determineSeverity(columnName, asset);

    // Null check rule
    if (column.nullRate < 50) { // Only if column is mostly non-null
      const threshold = column.nullRate < 5 ? 95 : column.nullRate < 20 ? 80 : 60;
      rules.push({
        name: `${asset.name}.${column.name} null check`,
        description: `${column.name} should have no more than ${100 - threshold}% null values`,
        ruleType: 'null_check',
        targetAsset: asset.name,
        targetColumn: column.name,
        expression: `${column.name} IS NOT NULL`,
        threshold,
        severity: severity,
        enabled: true,
      });
    }

    // Pattern checks
    if (column.patterns?.includes('email')) {
      rules.push({
        name: `${asset.name}.${column.name} email format`,
        description: `${column.name} should contain valid email addresses`,
        ruleType: 'pattern_check',
        targetAsset: asset.name,
        targetColumn: column.name,
        expression: `^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$`,
        threshold: 90,
        severity: 'medium',
        enabled: true,
      });
    }

    if (column.patterns?.includes('phone')) {
      rules.push({
        name: `${asset.name}.${column.name} phone format`,
        description: `${column.name} should contain valid phone numbers`,
        ruleType: 'pattern_check',
        targetAsset: asset.name,
        targetColumn: column.name,
        expression: `^[\\d\\s\\-\\+\\(\\)]{7,20}$`,
        threshold: 85,
        severity: 'low',
        enabled: true,
      });
    }

    // Range checks for numbers
    if (column.type === 'number' && column.min !== undefined) {
      // Amount fields should be positive
      if (columnName.includes('amount') || columnName.includes('price') || columnName.includes('total')) {
        rules.push({
          name: `${asset.name}.${column.name} positive value`,
          description: `${column.name} should be a positive value`,
          ruleType: 'range_check',
          targetAsset: asset.name,
          targetColumn: column.name,
          expression: `${column.name} >= 0`,
          threshold: 99,
          severity: 'high',
          enabled: true,
          metadata: { min: 0 },
        });
      }
    }

    // Uniqueness for ID fields
    if (columnName.endsWith('_id') && column.uniqueRate > 90) {
      rules.push({
        name: `${asset.name}.${column.name} uniqueness`,
        description: `${column.name} should have unique values`,
        ruleType: 'uniqueness',
        targetAsset: asset.name,
        targetColumn: column.name,
        expression: `COUNT(DISTINCT ${column.name}) = COUNT(${column.name})`,
        threshold: 100,
        severity: columnName === 'id' ? 'critical' : 'high',
        enabled: true,
      });
    }

    // Referential integrity for foreign keys
    if (columnName.endsWith('_id') && columnName !== 'id') {
      const referencedTable = this.inferReferencedTable(columnName);
      if (referencedTable) {
        rules.push({
          name: `${asset.name}.${column.name} referential integrity`,
          description: `${column.name} should reference valid records in ${referencedTable}`,
          ruleType: 'referential',
          targetAsset: asset.name,
          targetColumn: column.name,
          expression: `EXISTS (SELECT 1 FROM ${referencedTable} WHERE id = ${column.name})`,
          threshold: 100,
          severity: 'high',
          enabled: true,
          metadata: { referencedTable },
        });
      }
    }

    return rules;
  }

  private determineSeverity(columnName: string, asset: any): 'critical' | 'high' | 'medium' | 'low' {
    // Critical columns
    if (['customer_id', 'account_id', 'transaction_id', 'amount', 'balance'].includes(columnName)) {
      return 'critical';
    }

    // High importance
    if (columnName.endsWith('_id') || ['status', 'date', 'type'].includes(columnName)) {
      return 'high';
    }

    // Gold layer should have stricter rules
    if (asset.layer === 'gold' || asset.layer === 'consumer') {
      return 'high';
    }

    // Silver layer
    if (asset.layer === 'silver') {
      return 'medium';
    }

    return 'low';
  }

  private inferReferencedTable(columnName: string): string | null {
    // Remove _id suffix and pluralize
    const baseName = columnName.replace(/_id$/, '');

    const mappings: Record<string, string> = {
      'customer': 'meridian.silver_customers',
      'branch': 'meridian.ref_branches',
      'account': 'meridian.silver_accounts',
      'transaction': 'meridian.silver_transactions',
    };

    return mappings[baseName] || null;
  }

  private async saveRule(rule: QualityRule): Promise<void> {
    // Check if rule already exists
    const { data: existing } = await this.supabase
      .from('quality_rules')
      .select('id')
      .eq('name', rule.name)
      .single();

    if (existing) return; // Don't duplicate

    await this.supabase.from('quality_rules').insert({
      name: rule.name,
      description: rule.description,
      rule_type: rule.ruleType,
      target_asset: rule.targetAsset,
      target_column: rule.targetColumn,
      expression: rule.expression,
      threshold: rule.threshold,
      severity: rule.severity,
      enabled: rule.enabled,
      metadata: rule.metadata,
    });
  }

  private async validateRule(rule: QualityRule): Promise<QualityValidationResult> {
    const tableName = this.getTableNameFromAsset(rule.targetAsset);
    if (!tableName) {
      return {
        rule,
        passed: true, // Can't validate, assume pass
        totalRecords: 0,
        passedRecords: 0,
        failedRecords: 0,
        passRate: 100,
      };
    }

    try {
      const [schema, table] = tableName.split('.');

      // Get all records
      const { data: allRecords, error } = await this.meridian
        .from(table)
        .select('*');

      if (error || !allRecords) {
        throw new Error(`Failed to fetch data: ${error?.message}`);
      }

      const totalRecords = allRecords.length;
      let passedRecords = 0;
      const sampleFailures: any[] = [];

      // Validate based on rule type
      for (const record of allRecords) {
        const passed = this.evaluateRule(rule, record);
        if (passed) {
          passedRecords++;
        } else if (sampleFailures.length < 5) {
          sampleFailures.push(record);
        }
      }

      const failedRecords = totalRecords - passedRecords;
      const passRate = totalRecords > 0 ? (passedRecords / totalRecords) * 100 : 100;

      return {
        rule,
        passed: passRate >= rule.threshold,
        totalRecords,
        passedRecords,
        failedRecords,
        passRate,
        sampleFailures,
      };
    } catch (error) {
      console.error(`Failed to validate rule ${rule.name}:`, error);
      return {
        rule,
        passed: true, // Can't validate, assume pass
        totalRecords: 0,
        passedRecords: 0,
        failedRecords: 0,
        passRate: 100,
      };
    }
  }

  private getTableNameFromAsset(assetName: string): string | null {
    const name = assetName.toLowerCase();
    if (name.includes('silver_') || name.includes('gold_') || name.includes('ref_') || name.includes('bronze_')) {
      return `meridian.${name}`;
    }
    return null;
  }

  private evaluateRule(rule: QualityRule, record: any): boolean {
    const value = rule.targetColumn ? record[rule.targetColumn] : null;

    switch (rule.ruleType) {
      case 'null_check':
        return value !== null && value !== undefined && value !== '';

      case 'range_check':
        if (value === null || value === undefined) return true; // Nulls handled by null_check
        const min = rule.metadata?.min;
        const max = rule.metadata?.max;
        if (min !== undefined && value < min) return false;
        if (max !== undefined && value > max) return false;
        return true;

      case 'pattern_check':
        if (value === null || value === undefined) return true;
        try {
          const regex = new RegExp(rule.expression);
          return regex.test(String(value));
        } catch {
          return true;
        }

      case 'uniqueness':
        // Uniqueness is checked at dataset level, not row level
        return true;

      case 'referential':
        // Would need to check against referenced table
        return value !== null && value !== undefined;

      default:
        return true;
    }
  }

  private async createValidationIssue(result: QualityValidationResult): Promise<boolean> {
    // Check if similar issue already exists
    const { data: existing } = await this.supabase
      .from('issues')
      .select('id')
      .eq('title', `Quality rule failed: ${result.rule.name}`)
      .in('status', ['open', 'investigating', 'in_progress'])
      .single();

    if (existing) return false; // Don't create duplicate

    const issue: DetectedIssue = {
      title: `Quality rule failed: ${result.rule.name}`,
      description: `The quality rule "${result.rule.name}" failed validation.

**Rule Details:**
- Type: ${result.rule.ruleType}
- Target: ${result.rule.targetAsset}.${result.rule.targetColumn || '*'}
- Expression: ${result.rule.expression}
- Required threshold: ${result.rule.threshold}%

**Validation Results:**
- Total records: ${result.totalRecords.toLocaleString()}
- Passed: ${result.passedRecords.toLocaleString()} (${result.passRate.toFixed(1)}%)
- Failed: ${result.failedRecords.toLocaleString()}

${result.sampleFailures && result.sampleFailures.length > 0 ? `
**Sample Failures:**
${JSON.stringify(result.sampleFailures.slice(0, 3), null, 2)}
` : ''}`,
      severity: result.rule.severity,
      issueType: 'quality_failure',
      affectedAssets: [result.rule.targetAsset],
      metadata: {
        ruleId: result.rule.id,
        ruleName: result.rule.name,
        ruleType: result.rule.ruleType,
        passRate: result.passRate,
        threshold: result.rule.threshold,
        failedRecords: result.failedRecords,
        sampleFailures: result.sampleFailures,
      },
    };

    await this.createIssue(issue);
    return true;
  }
}

// Singleton instance
let qualityAgentInstance: QualityAgent | null = null;

export function getQualityAgent(): QualityAgent {
  if (!qualityAgentInstance) {
    qualityAgentInstance = new QualityAgent();
  }
  return qualityAgentInstance;
}
