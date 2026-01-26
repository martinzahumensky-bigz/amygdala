import { BaseAgent, AgentContext, AgentRunResult, DetectedIssue } from './base';
import { getMeridianClient, getAmygdalaClient } from '../supabase/client';

interface DataQualityCheck {
  table: string;
  column: string;
  checkType: 'null_rate' | 'outlier' | 'invalid_reference' | 'freshness';
  threshold?: number;
}

interface AnomalyResult {
  check: DataQualityCheck;
  value: number;
  passed: boolean;
  details: Record<string, any>;
}

export class SpotterAgent extends BaseAgent {
  private meridianClient = getMeridianClient();

  constructor() {
    super('spotter', 'Detects anomalies that would make users distrust data');
  }

  get systemPrompt(): string {
    return `You are the Spotter agent for the Amygdala data trust platform. Your role is to:

1. Analyze data quality metrics and identify anomalies
2. Detect patterns that would make business users distrust the data
3. Prioritize issues by business impact
4. Provide clear, actionable descriptions of problems found

When analyzing data, consider:
- Missing or null values that shouldn't be missing
- Values that are statistical outliers (more than 3 standard deviations)
- Invalid references to lookup tables
- Data freshness issues (stale data)
- Sudden changes in data patterns

Always respond with a JSON object containing:
{
  "anomalies": [
    {
      "severity": "critical|high|medium|low",
      "title": "Brief title",
      "description": "Detailed description",
      "recommendation": "What to do about it"
    }
  ],
  "summary": "Overall assessment"
}`;
  }

  async run(context?: AgentContext): Promise<AgentRunResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let issuesCreated = 0;
    const stats: Record<string, number> = {
      tablesScanned: 0,
      checksPerformed: 0,
      anomaliesDetected: 0,
    };

    const runId = await this.startRun(context);

    try {
      await this.log('run_started', 'Spotter agent started scanning Meridian Bank data');

      // Define quality checks to perform
      const checks: DataQualityCheck[] = [
        // Customer data quality
        { table: 'silver_customers', column: 'email', checkType: 'null_rate', threshold: 5 },
        { table: 'silver_customers', column: 'phone', checkType: 'null_rate', threshold: 10 },
        { table: 'silver_customers', column: 'email_valid', checkType: 'null_rate', threshold: 0 },

        // Transaction data quality
        { table: 'silver_transactions', column: 'branch_id', checkType: 'invalid_reference', threshold: 1 },
        { table: 'silver_transactions', column: 'amount', checkType: 'outlier', threshold: 3 },

        // Revenue data freshness
        { table: 'gold_daily_revenue', column: 'date', checkType: 'freshness', threshold: 2 },

        // Loan data quality
        { table: 'silver_loans', column: 'customer_id', checkType: 'invalid_reference', threshold: 0 },
        { table: 'silver_loans', column: 'ltv_ratio', checkType: 'outlier', threshold: 3 },
      ];

      const results: AnomalyResult[] = [];

      // Run each check
      for (const check of checks) {
        stats.checksPerformed++;

        try {
          const result = await this.performCheck(check);
          results.push(result);

          if (!result.passed) {
            stats.anomaliesDetected++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Check failed for ${check.table}.${check.column}: ${errorMsg}`);
          await this.log('check_failed', `Failed to check ${check.table}.${check.column}`, { error: errorMsg });
        }
      }

      stats.tablesScanned = new Set(checks.map(c => c.table)).size;

      // Create issues for failed checks
      const failedChecks = results.filter(r => !r.passed);

      for (const result of failedChecks) {
        const issue = this.createIssueFromResult(result);
        await this.createIssue(issue);
        issuesCreated++;
      }

      // Use Claude to provide overall analysis if there are anomalies
      if (failedChecks.length > 0) {
        try {
          const analysis = await this.analyzeWithClaude(
            'Analyze these data quality issues and provide a summary of the most critical concerns:',
            failedChecks.map(r => ({
              table: r.check.table,
              column: r.check.column,
              checkType: r.check.checkType,
              value: r.value,
              details: r.details,
            }))
          );

          await this.log('analysis_complete', 'Claude analysis completed', { analysis });
        } catch (error) {
          // Non-critical, just log it
          await this.log('analysis_skipped', 'Claude analysis skipped due to error');
        }
      }

      await this.log('run_completed', `Spotter completed: ${stats.anomaliesDetected} anomalies found, ${issuesCreated} issues created`, stats);

      await this.completeRun(runId, {
        stats,
        issuesCreated,
        failedChecks: failedChecks.length,
      });

      return {
        success: true,
        runId,
        stats,
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
        stats,
        issuesCreated,
        errors: [...errors, errorMsg],
        duration: Date.now() - startTime,
      };
    }
  }

  private async performCheck(check: DataQualityCheck): Promise<AnomalyResult> {
    switch (check.checkType) {
      case 'null_rate':
        return this.checkNullRate(check);
      case 'outlier':
        return this.checkOutliers(check);
      case 'invalid_reference':
        return this.checkInvalidReferences(check);
      case 'freshness':
        return this.checkFreshness(check);
      default:
        throw new Error(`Unknown check type: ${check.checkType}`);
    }
  }

  private async checkNullRate(check: DataQualityCheck): Promise<AnomalyResult> {
    // Get total count and null count
    const { count: totalCount } = await this.meridianClient
      .from(check.table)
      .select('*', { count: 'exact', head: true });

    const { count: nullCount } = await this.meridianClient
      .from(check.table)
      .select('*', { count: 'exact', head: true })
      .is(check.column, null);

    const nullRate = totalCount ? ((nullCount || 0) / totalCount) * 100 : 0;
    const threshold = check.threshold || 5;
    const passed = nullRate <= threshold;

    await this.log(
      'check_null_rate',
      `Null rate check on ${check.table}.${check.column}: ${nullRate.toFixed(2)}%`,
      { nullRate, threshold, passed, totalCount, nullCount }
    );

    return {
      check,
      value: nullRate,
      passed,
      details: { totalCount, nullCount, threshold },
    };
  }

  private async checkOutliers(check: DataQualityCheck): Promise<AnomalyResult> {
    // Fetch numeric values for statistical analysis
    const { data } = await this.meridianClient
      .from(check.table)
      .select(check.column)
      .not(check.column, 'is', null)
      .limit(10000);

    if (!data || data.length === 0) {
      return {
        check,
        value: 0,
        passed: true,
        details: { message: 'No data to analyze' },
      };
    }

    const values = data.map((row: any) => parseFloat(row[check.column])).filter((v: number) => !isNaN(v));

    if (values.length === 0) {
      return {
        check,
        value: 0,
        passed: true,
        details: { message: 'No numeric values found' },
      };
    }

    // Calculate mean and std dev
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    // Count outliers (values beyond threshold std devs)
    const threshold = check.threshold || 3;
    const outliers = values.filter((v: number) => Math.abs(v - mean) > threshold * stdDev);
    const outlierRate = (outliers.length / values.length) * 100;

    // More than 1% outliers is concerning
    const passed = outlierRate <= 1;

    await this.log(
      'check_outliers',
      `Outlier check on ${check.table}.${check.column}: ${outlierRate.toFixed(2)}% outliers`,
      { outlierRate, mean, stdDev, outlierCount: outliers.length, totalCount: values.length, passed }
    );

    return {
      check,
      value: outlierRate,
      passed,
      details: { mean, stdDev, outlierCount: outliers.length, totalCount: values.length },
    };
  }

  private async checkInvalidReferences(check: DataQualityCheck): Promise<AnomalyResult> {
    // Check for invalid branch_id references
    if (check.column === 'branch_id') {
      const { data: transactions } = await this.meridianClient
        .from(check.table)
        .select('branch_id')
        .not('branch_id', 'is', null);

      const { data: validBranches } = await this.meridianClient
        .from('ref_branches')
        .select('branch_id');

      if (!transactions || !validBranches) {
        return { check, value: 0, passed: true, details: { message: 'Could not fetch data' } };
      }

      const validBranchIds = new Set(validBranches.map((b: any) => b.branch_id));
      const invalidRefs = transactions.filter((t: any) => !validBranchIds.has(t.branch_id));
      const invalidRate = (invalidRefs.length / transactions.length) * 100;

      const threshold = check.threshold || 1;
      const passed = invalidRate <= threshold;

      await this.log(
        'check_invalid_refs',
        `Invalid reference check on ${check.table}.${check.column}: ${invalidRate.toFixed(2)}% invalid`,
        { invalidRate, invalidCount: invalidRefs.length, totalCount: transactions.length, passed }
      );

      return {
        check,
        value: invalidRate,
        passed,
        details: { invalidCount: invalidRefs.length, totalCount: transactions.length },
      };
    }

    // Check for invalid customer_id references
    if (check.column === 'customer_id') {
      const { data: records } = await this.meridianClient
        .from(check.table)
        .select('customer_id')
        .not('customer_id', 'is', null);

      const { data: validCustomers } = await this.meridianClient
        .from('silver_customers')
        .select('customer_id');

      if (!records || !validCustomers) {
        return { check, value: 0, passed: true, details: { message: 'Could not fetch data' } };
      }

      const validCustomerIds = new Set(validCustomers.map((c: any) => c.customer_id));
      const invalidRefs = records.filter((r: any) => !validCustomerIds.has(r.customer_id));
      const invalidRate = records.length > 0 ? (invalidRefs.length / records.length) * 100 : 0;

      const threshold = check.threshold || 0;
      const passed = invalidRate <= threshold;

      await this.log(
        'check_invalid_refs',
        `Invalid reference check on ${check.table}.${check.column}: ${invalidRate.toFixed(2)}% invalid`,
        { invalidRate, invalidCount: invalidRefs.length, totalCount: records.length, passed }
      );

      return {
        check,
        value: invalidRate,
        passed,
        details: { invalidCount: invalidRefs.length, totalCount: records.length },
      };
    }

    return { check, value: 0, passed: true, details: { message: 'Unsupported reference check' } };
  }

  private async checkFreshness(check: DataQualityCheck): Promise<AnomalyResult> {
    // Get the most recent record
    const { data } = await this.meridianClient
      .from(check.table)
      .select(check.column)
      .order(check.column, { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        check,
        value: 999,
        passed: false,
        details: { message: 'No data found', lastDate: null },
      };
    }

    const lastDate = new Date(data[0][check.column]);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const threshold = check.threshold || 2;
    const passed = daysSinceUpdate <= threshold;

    await this.log(
      'check_freshness',
      `Freshness check on ${check.table}.${check.column}: ${daysSinceUpdate} days since last update`,
      { daysSinceUpdate, lastDate: lastDate.toISOString(), threshold, passed }
    );

    return {
      check,
      value: daysSinceUpdate,
      passed,
      details: { lastDate: lastDate.toISOString(), daysSinceUpdate },
    };
  }

  private createIssueFromResult(result: AnomalyResult): DetectedIssue {
    const { check, value, details } = result;

    let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    let title = '';
    let description = '';
    let issueType: DetectedIssue['issueType'] = 'anomaly';

    switch (check.checkType) {
      case 'null_rate':
        issueType = 'quality_failure';
        if (value > 20) severity = 'critical';
        else if (value > 10) severity = 'high';
        else if (value > 5) severity = 'medium';
        else severity = 'low';

        title = `High null rate in ${check.table}.${check.column}`;
        description = `${value.toFixed(2)}% of records have null values in the ${check.column} column. ` +
          `Expected threshold: ${check.threshold}%. ` +
          `Affected records: ${details.nullCount} out of ${details.totalCount}.`;
        break;

      case 'outlier':
        issueType = 'anomaly';
        if (value > 5) severity = 'high';
        else if (value > 2) severity = 'medium';
        else severity = 'low';

        title = `Statistical outliers detected in ${check.table}.${check.column}`;
        description = `${value.toFixed(2)}% of values are statistical outliers (beyond ${check.threshold} standard deviations). ` +
          `Mean: ${details.mean?.toFixed(2)}, Std Dev: ${details.stdDev?.toFixed(2)}. ` +
          `Outlier count: ${details.outlierCount} out of ${details.totalCount}.`;
        break;

      case 'invalid_reference':
        issueType = 'missing_reference';
        if (value > 5) severity = 'critical';
        else if (value > 2) severity = 'high';
        else if (value > 0) severity = 'medium';

        title = `Invalid ${check.column} references in ${check.table}`;
        description = `${value.toFixed(2)}% of records reference non-existent ${check.column} values. ` +
          `Invalid count: ${details.invalidCount} out of ${details.totalCount}. ` +
          `This may cause report errors or incorrect aggregations.`;
        break;

      case 'freshness':
        issueType = 'freshness';
        if (value > 7) severity = 'critical';
        else if (value > 3) severity = 'high';
        else if (value > 1) severity = 'medium';
        else severity = 'low';

        title = `Stale data in ${check.table}`;
        description = `Data in ${check.table} is ${value} days old. ` +
          `Last update: ${details.lastDate}. ` +
          `Expected freshness: within ${check.threshold} days.`;
        break;
    }

    return {
      title,
      description,
      severity,
      issueType,
      affectedAssets: [check.table],
      metadata: { checkType: check.checkType, column: check.column, value, ...details },
    };
  }
}

// Singleton instance
let spotterInstance: SpotterAgent | null = null;

export function getSpotterAgent(): SpotterAgent {
  if (!spotterInstance) {
    spotterInstance = new SpotterAgent();
  }
  return spotterInstance;
}
