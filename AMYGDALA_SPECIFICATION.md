# AMYGDALA
## Next-Generation Agentic Data Trust Platform

> **Related Documents:**
> - [Original Vision Prompt](./ORIGINAL_PROMPT.md) - The original vision that inspired this platform
> - [Meridian Bank Specification](./MERIDIAN_BANK_SPECIFICATION.md) - Simulated data environment for demos
> - [Project Structure](./PROJECT_STRUCTURE.md) - Monorepo architecture and file organization
> - [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) - Phase-by-phase implementation plan

---

### Executive Summary

Amygdala is a revolutionary approach to data trust and quality management. Unlike traditional rule-based platforms that work bottom-up (documenting sources, then hoping users find value), Amygdala works **top-down**—starting from the reports and applications that business users actually rely on, then tracing backwards through the data pipeline to ensure trustworthiness at every layer.

The platform employs a system of specialized AI agents, each with a distinct responsibility, working collaboratively to continuously monitor, document, debug, validate, and improve data assets. This mimics how expert data engineers naturally work—but operates 24/7 at scale.

---

## Part 1: Vision & Philosophy

### The Problem with Current Approaches

**Traditional data quality and catalog tools fail because they're inverted.**

Current tools document data assets from the bottom up:
- Start with source databases
- Try to describe tables and columns
- Attempt to calculate lineage
- Hope users understand how data flows to reports

**This creates several critical gaps:**

1. **Discovery Gap**: Users discover issues by looking at reports and saying "this doesn't look right"—not by browsing catalogs
2. **Context Gap**: Documenting a table in isolation misses how it's actually used downstream
3. **Reactive Gap**: Pipeline monitoring catches failures but not content anomalies
4. **Trust Gap**: No holistic view of whether data can be trusted for a specific purpose

### The Amygdala Philosophy

**Start where trust is evaluated—at the consumer-facing layer.**

When a CFO looks at a revenue report and says "I don't trust this data," they're evaluating trust at the report level. Amygdala recognizes this and:

1. **Documents backwards**: From reports → aggregation layers → source tables
2. **Monitors forward**: Watches reports for anomalies that humans would catch
3. **Debugs intelligently**: Traces issues through lineage to find root causes
4. **Validates contextually**: Creates quality rules based on how data is actually used
5. **Trusts holistically**: Provides trust scores that consider the entire data supply chain

---

## Part 2: Agent Architecture

### Overview

Amygdala employs six specialized agents, each operating autonomously but collaboratively:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AMYGDALA AGENT ECOSYSTEM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│   │ DOCUMENTARIST│    │   SPOTTER    │    │   DEBUGGER   │          │
│   │              │    │              │    │              │          │
│   │ Catalogs     │    │ Monitors     │    │ Root cause   │          │
│   │ assets       │───►│ anomalies    │───►│ analysis     │          │
│   │ top-down     │    │ in reports   │    │ & fixes      │          │
│   └──────────────┘    └──────────────┘    └──────────────┘          │
│          │                   │                   │                   │
│          ▼                   ▼                   ▼                   │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│   │   QUALITY    │    │TRANSFORMATION│    │    TRUST     │          │
│   │    AGENT     │    │    AGENT     │    │    AGENT     │          │
│   │              │    │              │    │              │          │
│   │ Validates    │◄──►│ Repairs &    │◄──►│ Calculates   │          │
│   │ data rules   │    │ transforms   │    │ trust scores │          │
│   └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Agent 1: DOCUMENTARIST
**Mission**: Build a living catalog by tracing data from consumption to source

#### Responsibilities

1. **Report Analysis**
   - Connect to reporting systems (HTML reports, BI tools, applications)
   - Parse report structure, identify visualizations, tables, KPIs
   - Extract calculation logic, formulas, aggregations
   - Identify source queries and data transformations

2. **Lineage Tracing**
   - For each report element, identify feeding tables
   - Trace back through gold → silver → bronze layers
   - Collect transformation scripts, stored procedures, ETL jobs
   - Build complete data flow graphs

3. **Asset Documentation**
   - Create catalog entries for every discovered asset
   - Generate descriptions based on actual content (not just schema)
   - Document usage patterns: common filters, aggregations, joins
   - Record downstream consumers and their requirements

4. **Profiling Integration**
   - Execute profiling on discovered tables
   - Calculate statistics: min, max, mean, distribution, cardinality
   - Detect data formats, patterns, value ranges
   - Store historical profiles for trend analysis

5. **Ownership Management**
   - Identify asset owners through metadata, access patterns
   - Create issues when ownership is unclear
   - Track stewardship responsibilities

#### Behavioral Rules

```yaml
documentarist:
  triggers:
    - scheduled: "daily at 02:00"
    - on_demand: "when new report discovered"
    - event: "when spotter finds undocumented asset"
  
  workflow:
    1. scan_consumer_systems()
    2. for each report:
         - parse_report_structure()
         - extract_calculation_logic()
         - identify_source_tables()
    3. for each source_table:
         - trace_upstream_lineage()
         - collect_transformation_scripts()
         - execute_profiling()
    4. update_catalog()
    5. create_ownership_issues_if_needed()
  
  outputs:
    - catalog_entries: Asset[]
    - lineage_graphs: LineageGraph[]
    - profiling_results: Profile[]
    - issues: Issue[]
```

#### Catalog Entry Structure

```typescript
interface CatalogEntry {
  id: string;
  name: string;
  type: 'report' | 'dashboard' | 'table' | 'view' | 'api' | 'file';
  layer: 'consumer' | 'gold' | 'silver' | 'bronze' | 'raw';
  
  // Content-based description
  description: string;
  businessContext: string;
  dataCharacteristics: string;
  
  // Lineage
  upstreamAssets: string[];
  downstreamAssets: string[];
  transformations: Transformation[];
  
  // Usage patterns
  usageStatistics: {
    accessFrequency: number;
    uniqueUsers: number;
    commonFilters: string[];
    commonAggregations: string[];
  };
  
  // Profiling
  profile: {
    rowCount: number;
    columnProfiles: ColumnProfile[];
    lastProfiled: Date;
    freshnessIndicator: string;
  };
  
  // Governance
  owner: string;
  steward: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // Agent ratings
  qualityScore: number;
  trustScore: number;
  
  // Agent logs
  agentLogs: AgentLog[];
}
```

---

### Agent 2: SPOTTER
**Mission**: Detect anomalies that would make humans distrust their data

#### Responsibilities

1. **Visual Anomaly Detection**
   - Open reports programmatically
   - Capture visual state of charts, tables, KPIs
   - Compare against historical baselines
   - Identify visual discrepancies

2. **Pattern Monitoring**
   - Track time series for missing data points
   - Monitor value ranges for sudden changes
   - Check distributions for unexpected shifts
   - Verify expected data freshness

3. **Business Rule Validation**
   - Revenue should grow gradually, not spike 1000%
   - All branches should have data
   - Yesterday's data should exist today
   - Totals should match sum of parts

4. **Historical Comparison**
   - Store snapshots of key metrics
   - Day-over-day comparison
   - Week-over-week trend analysis
   - Seasonal pattern recognition

5. **Alert Classification**
   - Severity: critical / high / medium / low
   - Confidence: high probability / possible / uncertain
   - Impact assessment: affected reports and users
   - Urgency: immediate / within hours / within days

#### Behavioral Rules

```yaml
spotter:
  triggers:
    - scheduled: "every 15 minutes for critical reports"
    - scheduled: "every hour for standard reports"
    - on_demand: "user reports suspicious data"
  
  workflow:
    1. for each monitored_report:
         - capture_current_state()
         - load_historical_baselines()
         - compare_and_detect_anomalies()
    2. for each anomaly:
         - classify_severity()
         - assess_confidence()
         - estimate_impact()
    3. create_issues_and_alerts()
    4. optionally: trigger_debugger()
    5. store_snapshot_for_comparison()
  
  anomaly_patterns:
    - missing_data:
        description: "Expected data points not present"
        indicators: ["null values where expected", "zero counts", "missing dates"]
    
    - value_anomaly:
        description: "Values outside expected ranges"
        indicators: ["sudden spikes", "unexpected drops", "negative values"]
    
    - distribution_shift:
        description: "Data distribution has changed"
        indicators: ["category proportions changed", "outlier increase"]
    
    - freshness_issue:
        description: "Data not updated as expected"
        indicators: ["stale timestamps", "missing recent records"]
    
    - completeness_issue:
        description: "Expected elements missing"
        indicators: ["missing branches", "missing products", "truncated data"]

  outputs:
    - alerts: Alert[]
    - issues: Issue[]
    - snapshots: Snapshot[]
```

#### Anomaly Detection Examples

```typescript
interface AnomalyCheck {
  check_missing_today_data(report: Report): Anomaly | null {
    // Revenue report should always have yesterday's data by 8am
    const yesterday = getYesterday();
    const dataPoints = report.getDataForDate(yesterday);
    
    if (dataPoints.length === 0) {
      return {
        type: 'missing_data',
        severity: 'critical',
        confidence: 'high',
        message: `No data for ${yesterday} in revenue report`,
        affectedElements: ['daily_revenue_chart', 'summary_table'],
        suggestedAction: 'Check ETL pipeline completion'
      };
    }
    return null;
  }

  check_value_anomaly(metric: string, current: number, historical: number[]): Anomaly | null {
    const avg = mean(historical);
    const stdDev = standardDeviation(historical);
    const zScore = (current - avg) / stdDev;
    
    if (Math.abs(zScore) > 3) {
      return {
        type: 'value_anomaly',
        severity: zScore > 5 ? 'critical' : 'high',
        confidence: 'high',
        message: `${metric} is ${zScore.toFixed(1)} standard deviations from normal`,
        currentValue: current,
        expectedRange: [avg - 2*stdDev, avg + 2*stdDev],
        suggestedAction: 'Investigate source data and calculations'
      };
    }
    return null;
  }

  check_distribution_completeness(report: Report, dimension: string): Anomaly | null {
    // Check if all expected categories are present
    const expectedCategories = getCatalogReference(dimension);
    const presentCategories = report.getDistinctValues(dimension);
    const missing = difference(expectedCategories, presentCategories);
    
    if (missing.length > 0) {
      return {
        type: 'completeness_issue',
        severity: missing.length > 3 ? 'high' : 'medium',
        confidence: 'high',
        message: `Missing ${missing.length} ${dimension}(s) in report`,
        missingValues: missing,
        suggestedAction: 'Check reference data and source filtering'
      };
    }
    return null;
  }
}
```

---

### Agent 3: DEBUGGER
**Mission**: Find root causes and fix issues automatically when possible

#### Responsibilities

1. **Issue Intake**
   - Monitor issue queue for new problems
   - Prioritize based on severity and business impact
   - Gather context from related assets

2. **Root Cause Analysis**
   - Trace affected data through lineage
   - Check each layer for anomalies
   - Examine pipeline execution logs
   - Identify transformation logic issues

3. **Automated Remediation**
   - Restart failed pipelines
   - Add missing reference data
   - Trigger data reprocessing
   - Apply quick fixes for known patterns

4. **Issue Escalation**
   - When unable to fix, escalate with context
   - Assign to appropriate owners
   - Provide detailed diagnostic information
   - Suggest remediation approaches

#### Behavioral Rules

```yaml
debugger:
  triggers:
    - event: "new issue created by spotter"
    - event: "user reports problem"
    - scheduled: "scan for stale issues every 4 hours"
  
  workflow:
    1. receive_issue()
    2. gather_context():
         - load_affected_assets()
         - load_lineage_graph()
         - load_recent_pipeline_logs()
    3. trace_root_cause():
         - for each upstream_layer:
             - check_data_quality()
             - check_pipeline_status()
             - check_transformation_logic()
         - identify_problematic_component()
    4. attempt_remediation():
         - if pipeline_failed:
             - analyze_error_logs()
             - attempt_restart()
             - if restart_fails: debug_and_fix()
         - if reference_data_missing:
             - validate_new_values()
             - add_if_legitimate()
             - notify_reference_owner()
         - if transformation_issue:
             - identify_fix()
             - if simple_fix: apply_and_test()
             - else: escalate_with_details()
    5. update_issue_with_findings()
    6. close_if_resolved() or escalate()
  
  auto_fix_patterns:
    - pipeline_restart:
        condition: "pipeline failed due to transient error"
        action: "restart pipeline, monitor for success"
    
    - reference_data_addition:
        condition: "new legitimate value missing from reference"
        action: "add value, notify owner for review"
    
    - data_refresh:
        condition: "stale data detected"
        action: "trigger refresh job"

  outputs:
    - issue_updates: IssueUpdate[]
    - automated_fixes: Fix[]
    - escalations: Escalation[]
```

#### Debug Workflow Example

```typescript
async function debugMissingBranchRevenue(issue: Issue): Promise<DebugResult> {
  const context = await gatherContext(issue);
  
  // Step 1: Check the report layer
  const report = await loadReport(context.affectedReport);
  const missingBranches = issue.details.missingBranches;
  
  // Step 2: Trace to gold layer
  const goldTable = await loadTable(context.lineage.goldTable);
  const goldHasBranches = await checkBranchesExist(goldTable, missingBranches);
  
  if (!goldHasBranches) {
    // Problem is upstream of gold layer
    
    // Step 3: Check silver layer
    const silverTable = await loadTable(context.lineage.silverTable);
    const silverHasBranches = await checkBranchesExist(silverTable, missingBranches);
    
    if (!silverHasBranches) {
      // Problem is in bronze or source
      
      // Step 4: Check bronze layer
      const bronzeTable = await loadTable(context.lineage.bronzeTable);
      const bronzeHasBranches = await checkBranchesExist(bronzeTable, missingBranches);
      
      if (bronzeHasBranches) {
        // Data exists in bronze but not silver
        // Check the silver ETL job
        const silverPipeline = await getPipelineStatus('bronze_to_silver');
        
        if (silverPipeline.status === 'failed') {
          // Found it: pipeline failed
          const restartResult = await restartPipeline(silverPipeline);
          
          if (restartResult.success) {
            return {
              rootCause: 'Pipeline bronze_to_silver failed',
              resolution: 'Automatically restarted pipeline',
              status: 'resolved'
            };
          }
        }
      }
      
      // Check reference data
      const branchRefTable = await loadReferenceTable('branches');
      const missingInRef = missingBranches.filter(
        b => !branchRefTable.includes(b)
      );
      
      if (missingInRef.length > 0) {
        // New branches not in reference data
        const validated = await validateNewBranches(missingInRef);
        
        if (validated.allLegitimate) {
          await addToReferenceTable('branches', missingInRef);
          await createNotification(
            'reference_data_owner',
            `Added ${missingInRef.length} new branches to reference table`
          );
          
          return {
            rootCause: 'New branches missing from reference data',
            resolution: 'Added new branches, notified owner',
            status: 'resolved'
          };
        }
      }
    }
  }
  
  // Could not auto-fix, escalate with details
  return {
    rootCause: 'Unable to determine automatically',
    diagnosticInfo: context,
    recommendation: 'Manual investigation required',
    status: 'escalated',
    assignedTo: context.assetOwner
  };
}
```

---

### Agent 4: QUALITY AGENT
**Mission**: Define and enforce contextual data quality rules

#### Responsibilities

1. **Rule Generation**
   - Analyze catalog metadata and profiling results
   - Consider downstream usage patterns
   - Use LLM intelligence to devise appropriate rules
   - Generate validation scripts

2. **Rule Calibration**
   - Execute validation against data
   - Analyze results for false positives
   - Adjust thresholds and logic
   - Iterate until reliable

3. **Continuous Validation**
   - Run validations on schedule
   - Track quality metrics over time
   - Detect degradation trends
   - Create issues for violations

4. **Remediation Routing**
   - Determine if issues can be auto-fixed
   - Route to Transformation Agent when applicable
   - Escalate source system issues to owners
   - Identify pipeline logic issues

#### Behavioral Rules

```yaml
quality_agent:
  triggers:
    - event: "new asset documented"
    - scheduled: "daily validation runs"
    - on_demand: "user requests quality assessment"
  
  workflow:
    1. for each asset needing rules:
         - analyze_catalog_metadata()
         - analyze_profiling_results()
         - analyze_usage_patterns()
         - generate_quality_rules()
    
    2. for each new rule:
         - implement_validation_script()
         - test_against_sample_data()
         - calibrate_thresholds()
         - if false_positive_rate > 5%:
             - adjust_rule_logic()
             - retest()
    
    3. on validation schedule:
         - execute_all_rules()
         - analyze_results()
         - update_quality_scores()
         - create_issues_for_violations()
    
    4. for each violation:
         - assess_remediability()
         - if auto_fixable: route_to_transformation_agent()
         - if source_issue: escalate_to_source_owner()
         - if pipeline_issue: escalate_to_pipeline_owner()

  rule_categories:
    - completeness:
        examples: ["required fields not null", "all categories present"]
    - validity:
        examples: ["phone matches format", "email has @ and domain"]
    - consistency:
        examples: ["state matches zip code", "age >= 0"]
    - timeliness:
        examples: ["data updated within 24h", "timestamps not in future"]
    - uniqueness:
        examples: ["no duplicate IDs", "unique email per customer"]
    - accuracy:
        examples: ["loan value <= collateral value", "discount <= 100%"]

  outputs:
    - validation_rules: Rule[]
    - validation_results: ValidationResult[]
    - quality_scores: QualityScore[]
    - issues: Issue[]
```

#### Intelligent Rule Generation

```typescript
interface RuleGenerator {
  generateRulesForAsset(asset: CatalogEntry): Rule[] {
    const rules: Rule[] = [];
    
    // Analyze each column
    for (const col of asset.profile.columnProfiles) {
      // Completeness rules
      if (this.isLikelyRequired(col, asset)) {
        rules.push({
          name: `${col.name}_not_null`,
          type: 'completeness',
          expression: `${col.name} IS NOT NULL`,
          severity: 'high',
          rationale: `${col.name} is used in downstream calculations`
        });
      }
      
      // Format validation rules
      if (col.inferredType === 'phone') {
        rules.push({
          name: `${col.name}_valid_phone`,
          type: 'validity',
          expression: `REGEXP_MATCHES(${col.name}, '^\\+?[1-9]\\d{1,14}$')`,
          severity: 'medium',
          rationale: 'Phone numbers should be dialable format'
        });
      }
      
      if (col.inferredType === 'email') {
        rules.push({
          name: `${col.name}_valid_email`,
          type: 'validity',
          expression: `REGEXP_MATCHES(${col.name}, '^[^@]+@[^@]+\\.[^@]+$')`,
          severity: 'medium',
          rationale: 'Emails should have valid format'
        });
      }
      
      // Range rules based on profiling
      if (col.inferredType === 'numeric' && col.stats) {
        if (col.name.toLowerCase().includes('age')) {
          rules.push({
            name: `${col.name}_valid_age`,
            type: 'validity',
            expression: `${col.name} BETWEEN 0 AND 150`,
            severity: 'high',
            rationale: 'Age must be reasonable value'
          });
        }
        
        if (col.name.toLowerCase().includes('percent') || 
            col.name.toLowerCase().includes('rate')) {
          rules.push({
            name: `${col.name}_valid_percentage`,
            type: 'validity',
            expression: `${col.name} BETWEEN 0 AND 100`,
            severity: 'high',
            rationale: 'Percentage should be 0-100'
          });
        }
      }
    }
    
    // Cross-column rules based on business logic inference
    const businessRules = this.inferBusinessRules(asset);
    rules.push(...businessRules);
    
    return rules;
  }
  
  inferBusinessRules(asset: CatalogEntry): Rule[] {
    const rules: Rule[] = [];
    
    // Use LLM to analyze asset context and suggest rules
    const context = {
      description: asset.description,
      businessContext: asset.businessContext,
      columns: asset.profile.columnProfiles,
      usagePatterns: asset.usageStatistics
    };
    
    // Example inferences:
    // - If asset is used in loan application: loan_amount <= collateral_value
    // - If asset is customer data: one primary address per customer
    // - If asset is financial: amounts should balance
    
    return rules;
  }
}
```

---

### Agent 5: TRANSFORMATION AGENT
**Mission**: Repair data and create derived assets on demand

#### Responsibilities

1. **Automated Repairs**
   - Fix issues identified by Quality Agent
   - Standardize formats (dates, phones, addresses)
   - Fill missing values when rules exist
   - Remove invalid records with audit trail

2. **User-Requested Transformations**
   - Create filtered views (e.g., "only valid emails")
   - Merge datasets with fuzzy matching
   - Add computed columns
   - Build aggregated tables

3. **Script Management**
   - Implement transformations as reusable scripts
   - Version control all transformations
   - Schedule recurring transformations
   - Maintain transformation lineage

4. **Interactive Refinement**
   - Show preview on sample data
   - Ask clarifying questions
   - Iterate based on user feedback
   - Document business logic

#### Behavioral Rules

```yaml
transformation_agent:
  triggers:
    - event: "quality agent routes auto-fixable issue"
    - event: "user requests transformation"
    - scheduled: "run scheduled transformations"
  
  workflow:
    for quality_fixes:
      1. analyze_quality_issue()
      2. determine_fix_approach():
           - format_standardization
           - value_imputation
           - record_exclusion
           - relationship_resolution
      3. implement_transformation_script()
      4. test_on_sample()
      5. if results_acceptable:
           - execute_full_transformation()
           - update_catalog_with_transformed_asset()
           - link_to_original_with_transformation_lineage()
      6. report_results_to_quality_agent()
    
    for user_requests:
      1. understand_requirement()
      2. if unclear: ask_clarifying_questions()
      3. design_transformation()
      4. show_preview_on_sample()
      5. get_user_approval()
      6. implement_and_execute()
      7. create_catalog_entry_for_new_asset()
      8. offer_to_schedule_recurring()

  transformation_patterns:
    - format_standardization:
        examples: ["dates to ISO", "phones to E.164", "names to title case"]
    
    - value_derivation:
        examples: ["calculate age from DOB", "extract domain from email"]
    
    - filtering:
        examples: ["exclude invalid records", "only business emails"]
    
    - merging:
        examples: ["fuzzy match companies", "join on common key"]
    
    - aggregation:
        examples: ["sum by category", "count by date"]

  outputs:
    - transformation_scripts: Script[]
    - transformed_assets: Asset[]
    - transformation_lineage: Lineage[]
```

---

### Agent 6: TRUST AGENT
**Mission**: Calculate holistic trust scores and provide fitness-for-use assessments

#### Responsibilities

1. **Trust Score Calculation**
   - Aggregate signals from all agents
   - Weight factors by importance
   - Produce 1-5 star rating
   - Generate human-readable explanations

2. **Fitness-for-Use Assessment**
   - Consider current issues in supply chain
   - Evaluate recency of data
   - Check quality validation status
   - Produce RAG (Red/Amber/Green) indicator

3. **Trust Factor Analysis**
   - Documentation completeness
   - Ownership clarity
   - Usage breadth
   - Quality history
   - Issue resolution speed

4. **User Feedback Integration**
   - Accept user reports of problems
   - Trigger appropriate agents
   - Track user satisfaction over time
   - Adjust trust based on feedback

#### Behavioral Rules

```yaml
trust_agent:
  triggers:
    - scheduled: "recalculate all trust scores daily"
    - event: "issue status changes"
    - event: "quality validation completes"
    - event: "user provides feedback"
  
  workflow:
    for each asset:
      1. gather_trust_signals():
           - documentation_completeness
           - ownership_status
           - quality_scores
           - current_issues
           - upstream_issues
           - downstream_issues
           - usage_statistics
           - user_feedback
      
      2. calculate_trust_score():
           - weight_and_combine_signals()
           - normalize_to_5_star_scale()
      
      3. assess_current_fitness():
           - check_blocking_issues()
           - check_data_freshness()
           - check_upstream_health()
           - produce_rag_status()
      
      4. generate_explanation():
           - summarize_key_factors()
           - highlight_concerns()
           - suggest_improvements()
      
      5. update_catalog_entry()

  trust_factors:
    - documentation:
        weight: 0.15
        signals: ["has_description", "has_owner", "has_lineage"]
    
    - governance:
        weight: 0.20
        signals: ["has_steward", "classified", "reviewed_recently"]
    
    - quality:
        weight: 0.25
        signals: ["quality_score", "validation_coverage", "quality_trend"]
    
    - usage:
        weight: 0.15
        signals: ["access_frequency", "unique_users", "in_governed_reports"]
    
    - reliability:
        weight: 0.15
        signals: ["issue_count", "resolution_time", "pipeline_stability"]
    
    - freshness:
        weight: 0.10
        signals: ["data_recency", "profile_recency", "last_validated"]

  fitness_assessment:
    green: "No blocking issues, data fresh, quality validated"
    amber: "Minor issues exist, data slightly stale, or quality degraded"
    red: "Blocking issues, data stale, or critical quality failures"

  outputs:
    - trust_scores: TrustScore[]
    - fitness_assessments: FitnessAssessment[]
    - explanations: TrustExplanation[]
```

#### Trust Score Calculation

```typescript
interface TrustCalculator {
  calculateTrustScore(asset: CatalogEntry): TrustScore {
    const signals = this.gatherSignals(asset);
    
    // Documentation factor (15%)
    const docScore = this.scoreDocumentation(signals);
    
    // Governance factor (20%)
    const govScore = this.scoreGovernance(signals);
    
    // Quality factor (25%)
    const qualScore = this.scoreQuality(signals);
    
    // Usage factor (15%)
    const usageScore = this.scoreUsage(signals);
    
    // Reliability factor (15%)
    const reliabilityScore = this.scoreReliability(signals);
    
    // Freshness factor (10%)
    const freshnessScore = this.scoreFreshness(signals);
    
    // Weighted combination
    const rawScore = 
      docScore * 0.15 +
      govScore * 0.20 +
      qualScore * 0.25 +
      usageScore * 0.15 +
      reliabilityScore * 0.15 +
      freshnessScore * 0.10;
    
    // Convert to 5-star scale
    const stars = Math.round(rawScore * 5);
    
    // Generate explanation
    const explanation = this.generateExplanation({
      docScore, govScore, qualScore, 
      usageScore, reliabilityScore, freshnessScore
    });
    
    return {
      stars,
      rawScore,
      factors: { docScore, govScore, qualScore, usageScore, reliabilityScore, freshnessScore },
      explanation,
      calculatedAt: new Date()
    };
  }
  
  assessFitness(asset: CatalogEntry): FitnessAssessment {
    // Check for blocking issues
    const blockingIssues = asset.issues?.filter(i => 
      i.severity === 'critical' && i.status === 'open'
    ) || [];
    
    if (blockingIssues.length > 0) {
      return {
        status: 'red',
        reason: `${blockingIssues.length} critical issue(s) affecting this asset`,
        blockingIssues
      };
    }
    
    // Check upstream health
    const upstreamIssues = this.getUpstreamIssues(asset);
    if (upstreamIssues.some(i => i.severity === 'critical')) {
      return {
        status: 'red',
        reason: 'Critical issues in upstream data sources',
        upstreamIssues
      };
    }
    
    // Check freshness
    const dataAge = this.getDataAge(asset);
    const expectedFreshness = this.getExpectedFreshness(asset);
    if (dataAge > expectedFreshness * 2) {
      return {
        status: 'red',
        reason: `Data is ${dataAge} hours old, expected within ${expectedFreshness} hours`
      };
    }
    
    // Check for amber conditions
    const minorIssues = asset.issues?.filter(i => 
      i.status === 'open'
    ).length || 0;
    
    if (minorIssues > 0 || dataAge > expectedFreshness) {
      return {
        status: 'amber',
        reason: minorIssues > 0 
          ? `${minorIssues} open issue(s)` 
          : 'Data freshness slightly degraded'
      };
    }
    
    return {
      status: 'green',
      reason: 'No issues detected, data fresh, quality validated'
    };
  }
}
```

---

## Part 3: Application Design

### Design Philosophy

Amygdala's UI draws inspiration from Ataccama's clean, professional aesthetic while introducing a more agent-centric paradigm. The design emphasizes:

1. **Agent Visibility**: Agents are first-class citizens, not hidden background processes
2. **Trust at a Glance**: Trust scores and fitness indicators are always visible
3. **Issue-Driven Workflow**: Problems bubble up to users naturally
4. **Contextual Intelligence**: Agent insights are surfaced where relevant

### Color Palette

```css
:root {
  /* Primary */
  --primary-900: #1a1f36;     /* Deep navy - headers, critical text */
  --primary-700: #2d3748;     /* Navigation, sidebars */
  --primary-500: #4a5568;     /* Secondary text */
  --primary-100: #f7fafc;     /* Backgrounds */
  
  /* Trust indicators */
  --trust-5-star: #10b981;    /* Emerald - excellent */
  --trust-4-star: #22c55e;    /* Green - good */
  --trust-3-star: #eab308;    /* Yellow - acceptable */
  --trust-2-star: #f97316;    /* Orange - concerning */
  --trust-1-star: #ef4444;    /* Red - poor */
  
  /* RAG status */
  --rag-green: #10b981;
  --rag-amber: #f59e0b;
  --rag-red: #ef4444;
  
  /* Agent colors */
  --agent-documentarist: #8b5cf6;  /* Purple */
  --agent-spotter: #06b6d4;        /* Cyan */
  --agent-debugger: #f97316;       /* Orange */
  --agent-quality: #22c55e;        /* Green */
  --agent-transformation: #ec4899; /* Pink */
  --agent-trust: #eab308;          /* Yellow */
  
  /* Accents */
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
}
```

### Screen 1: Agent Command Center

The primary dashboard showing all agents and their status.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AMYGDALA                                         🔔 3  👤 Admin   ⚙️        │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  🏠 Home   │  AGENT COMMAND CENTER                                          │
│            │  ═══════════════════                                            │
│  🤖 Agents │                                                                 │
│  ├─ All    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  ├─ Logs   │  │ 📚          │ │ 👁️          │ │ 🔧          │               │
│            │  │DOCUMENTARIST│ │   SPOTTER   │ │  DEBUGGER   │               │
│  📁Catalog │  │             │ │             │ │             │               │
│  ├─ Assets │  │ Last: 2h ago│ │ Last: 5m ago│ │ Last: 12m   │               │
│  ├─ Reports│  │ ●●●●○ Idle  │ │ ●●●●● Active│ │ ●●●○○ Busy  │               │
│  ├─ Tables │  │             │ │             │ │             │               │
│            │  │ 847 assets  │ │ 12 monitors │ │ 3 active    │               │
│  ⚠️ Issues │  │ cataloged   │ │ 2 alerts    │ │ investigations│             │
│  ├─ Open   │  │             │ │             │ │             │               │
│  ├─ Mine   │  │ [Run Now]   │ │ [Run Now]   │ │ [Run Now]   │               │
│            │  └─────────────┘ └─────────────┘ └─────────────┘               │
│  ⚙️Settings│                                                                 │
│            │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│            │  │ ✅          │ │ 🔄          │ │ ⭐          │               │
│            │  │   QUALITY   │ │TRANSFORMATION│ │   TRUST    │               │
│            │  │    AGENT    │ │    AGENT    │ │   AGENT    │               │
│            │  │             │ │             │ │             │               │
│            │  │ Last: 1h ago│ │ Last: 30m   │ │ Last: 3h ago│               │
│            │  │ ●●●●○ Idle  │ │ ●●●○○ Busy  │ │ ●●●●○ Idle  │               │
│            │  │             │ │             │ │             │               │
│            │  │ 234 rules   │ │ 5 jobs      │ │ Avg: 3.7⭐  │               │
│            │  │ 89% passing │ │ running     │ │ ecosystem   │               │
│            │  │             │ │             │ │             │               │
│            │  │ [Run Now]   │ │ [Run Now]   │ [Recalculate]│               │
│            │  └─────────────┘ └─────────────┘ └─────────────┘               │
│            │                                                                 │
│            │  ─────────────────────────────────────────────────────────────  │
│            │  RECENT ACTIVITY                                                │
│            │                                                                 │
│            │  🔴 5m ago  Spotter detected revenue anomaly in Daily Report   │
│            │  🟡 12m ago Debugger investigating missing branch data          │
│            │  🟢 30m ago Quality Agent validated Customer360 (98% pass)     │
│            │  🟢 1h ago  Documentarist cataloged 12 new assets              │
│            │                                                                 │
└────────────┴────────────────────────────────────────────────────────────────┘
```

### Screen 2: Catalog Browser

Browsing cataloged assets with trust and quality indicators.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AMYGDALA                                         🔔 3  👤 Admin   ⚙️        │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  🏠 Home   │  CATALOG                           [+ Add Asset] [🔍 Search]   │
│            │  ═══════                                                        │
│  🤖 Agents │                                                                 │
│            │  Filter: [All Types ▼] [All Layers ▼] [All Status ▼]          │
│  📁Catalog │                                                                 │
│  ├─ Assets │  ┌─────────────────────────────────────────────────────────┐   │
│  ├─ Reports│  │ 📊 Daily Revenue Report                                  │   │
│  ├─ Tables │  │ Type: Report  Layer: Consumer  Owner: finance@acme.com  │   │
│            │  │                                                          │   │
│  ⚠️ Issues │  │ Trust: ⭐⭐⭐⭐☆ (4.2)     Fitness: 🟢 HEALTHY           │   │
│            │  │ Quality: 94%                Last updated: 2h ago         │   │
│            │  │                                                          │   │
│            │  │ Agent Insights:                                          │   │
│            │  │ 📚 "Well-documented, 14 source tables traced"           │   │
│            │  │ ✅ "All quality rules passing"                           │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │ 🗃️ customer_360_gold                                     │   │
│            │  │ Type: Table   Layer: Gold     Owner: data-eng@acme.com  │   │
│            │  │                                                          │   │
│            │  │ Trust: ⭐⭐⭐☆☆ (3.1)     Fitness: 🟡 DEGRADED           │   │
│            │  │ Quality: 78%                Last updated: 6h ago         │   │
│            │  │                                                          │   │
│            │  │ Agent Insights:                                          │   │
│            │  │ ⚠️ "2 open issues affecting this asset"                  │   │
│            │  │ 🔧 "Debugger investigating phone format failures"        │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │ 🗃️ orders_bronze                                         │   │
│            │  │ Type: Table   Layer: Bronze   Owner: unassigned         │   │
│            │  │                                                          │   │
│            │  │ Trust: ⭐⭐☆☆☆ (1.8)     Fitness: 🔴 CRITICAL            │   │
│            │  │ Quality: 45%                Last updated: 26h ago        │   │
│            │  │                                                          │   │
│            │  │ Agent Insights:                                          │   │
│            │  │ 🔴 "Pipeline failed, data stale for 26 hours"           │   │
│            │  │ 📚 "Missing owner - issue created for assignment"        │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
└────────────┴────────────────────────────────────────────────────────────────┘
```

### Screen 3: Asset Detail View

Detailed view of a single asset with all agent information.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AMYGDALA                                         🔔 3  👤 Admin   ⚙️        │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  ← Back    │  customer_360_gold                                             │
│            │  ══════════════════                                             │
│            │                                                                 │
│            │  ┌───────────────────────────────────────────────────────────┐ │
│            │  │  TYPE: Table    LAYER: Gold    OWNER: data-eng@acme.com  │ │
│            │  │                                                           │ │
│            │  │  TRUST: ⭐⭐⭐☆☆ 3.1              FITNESS: 🟡 DEGRADED    │ │
│            │  │                                                           │ │
│            │  │  "Comprehensive customer data. Trust degraded due to      │ │
│            │  │   2 open issues and 78% quality score. Phone validation   │ │
│            │  │   failures being investigated."                           │ │
│            │  └───────────────────────────────────────────────────────────┘ │
│            │                                                                 │
│            │  [Overview] [Data Profile] [Quality] [Lineage] [Issues] [Logs] │
│            │  ═══════════════════════════════════════════════════════════   │
│            │                                                                 │
│            │  AGENT ACTIVITY LOG                                            │
│            │  ──────────────────                                            │
│            │                                                                 │
│            │  📚 DOCUMENTARIST - 2h ago                                     │
│            │  ├─ Profiled 2.4M rows across 47 columns                       │
│            │  ├─ Updated lineage: 3 upstream, 8 downstream assets          │
│            │  └─ Rating: "Well-documented, active usage"                    │
│            │                                                                 │
│            │  ✅ QUALITY AGENT - 4h ago                                     │
│            │  ├─ Executed 23 validation rules                               │
│            │  ├─ Pass rate: 78% (18 passed, 5 failed)                      │
│            │  ├─ Failed: phone_valid_format (22% fail rate)                │
│            │  └─ Created issue #1247 for phone validation                   │
│            │                                                                 │
│            │  🔧 DEBUGGER - 1h ago                                          │
│            │  ├─ Investigating issue #1247                                  │
│            │  ├─ Root cause: Source system sending invalid formats          │
│            │  └─ Escalated to source-systems@acme.com                       │
│            │                                                                 │
│            │  ⭐ TRUST AGENT - 3h ago                                       │
│            │  ├─ Recalculated trust score: 3.1 (was 4.2)                   │
│            │  ├─ Degradation due to: quality issues, open incidents        │
│            │  └─ Fitness: 🟡 DEGRADED                                       │
│            │                                                                 │
│            │  ─────────────────────────────────────────────────────────────  │
│            │  RELATED ISSUES                    [View All →]                │
│            │                                                                 │
│            │  🔴 #1247 Phone validation failure rate 22%        [Open]     │
│            │  🟡 #1198 Duplicate customer IDs detected          [In Progress]│
│            │                                                                 │
└────────────┴────────────────────────────────────────────────────────────────┘
```

### Screen 4: Issues Management

Central issue tracking and management.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AMYGDALA                                         🔔 3  👤 Admin   ⚙️        │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  🏠 Home   │  ISSUES                                          [+ Create]   │
│            │  ══════                                                         │
│  🤖 Agents │                                                                 │
│            │  [All] [Open: 12] [Mine: 3] [Critical: 2]                      │
│  📁Catalog │                                                                 │
│            │  ┌─ Sort: Severity ▼ ─────────────────────────────────────────┐ │
│  ⚠️ Issues │  │                                                            │ │
│  ├─ Open   │  │  🔴 #1289 Revenue data missing for East region            │ │
│  ├─ Mine   │  │     Created: 15m ago by 👁️ Spotter                         │ │
│            │  │     Asset: Daily Revenue Report                            │ │
│            │  │     Assigned: data-eng@acme.com                            │ │
│            │  │     Status: 🔧 Debugger investigating                      │ │
│            │  │                                                            │ │
│            │  │  🔴 #1287 Pipeline bronze_orders failed                    │ │
│            │  │     Created: 2h ago by 🔧 Debugger                         │ │
│            │  │     Asset: orders_bronze                                   │ │
│            │  │     Assigned: pipeline-team@acme.com                       │ │
│            │  │     Status: Escalated                                      │ │
│            │  │                                                            │ │
│            │  │  🟡 #1247 Phone validation failure rate 22%                │ │
│            │  │     Created: 1d ago by ✅ Quality Agent                    │ │
│            │  │     Asset: customer_360_gold                               │ │
│            │  │     Assigned: source-systems@acme.com                      │ │
│            │  │     Status: Root cause identified                          │ │
│            │  │                                                            │ │
│            │  │  🟡 #1198 Duplicate customer IDs detected                  │ │
│            │  │     Created: 3d ago by ✅ Quality Agent                    │ │
│            │  │     Asset: customer_360_gold                               │ │
│            │  │     Assigned: data-eng@acme.com                            │ │
│            │  │     Status: 🔄 Fix in progress by Transformation Agent     │ │
│            │  │                                                            │ │
│            │  │  🟢 #1156 Missing branch reference: BR-WEST-042           │ │
│            │  │     Created: 5d ago by 👁️ Spotter                         │ │
│            │  │     Asset: branch_reference                                │ │
│            │  │     Assigned: reference-data@acme.com                      │ │
│            │  │     Status: ✅ Auto-fixed by Debugger, pending review      │ │
│            │  │                                                            │ │
│            │  └────────────────────────────────────────────────────────────┘ │
│            │                                                                 │
└────────────┴────────────────────────────────────────────────────────────────┘
```

### Screen 5: Agent Interaction (Chat Interface)

Direct interaction with agents for ad-hoc tasks.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ AMYGDALA                                         🔔 3  👤 Admin   ⚙️        │
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  🏠 Home   │  AGENT CHAT                                                    │
│            │  ══════════                                                     │
│  🤖 Agents │                                                                 │
│            │  Talking to: [🔄 Transformation Agent ▼]                       │
│            │                                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │                                                         │   │
│            │  │  👤 You (2 minutes ago)                                 │   │
│            │  │  I need to create a new table that combines            │   │
│            │  │  customer_360_gold with their recent orders.            │   │
│            │  │  Only include customers with valid emails.              │   │
│            │  │                                                         │   │
│            │  │  ─────────────────────────────────────────────────────  │   │
│            │  │                                                         │   │
│            │  │  🔄 Transformation Agent (1 minute ago)                 │   │
│            │  │  I understand. Let me clarify a few things:             │   │
│            │  │                                                         │   │
│            │  │  1. For "recent orders" - what time period?             │   │
│            │  │     □ Last 30 days                                      │   │
│            │  │     □ Last 90 days                                      │   │
│            │  │     □ Custom: ______                                    │   │
│            │  │                                                         │   │
│            │  │  2. What columns from orders should I include?          │   │
│            │  │     □ All columns                                       │   │
│            │  │     □ Summary (order_count, total_value)               │   │
│            │  │     □ Let me specify: ______                           │   │
│            │  │                                                         │   │
│            │  │  3. Output table name suggestion:                       │   │
│            │  │     customer_orders_combined_gold                       │   │
│            │  │                                                         │   │
│            │  │  ─────────────────────────────────────────────────────  │   │
│            │  │                                                         │   │
│            │  │  👤 You (30 seconds ago)                               │   │
│            │  │  Last 90 days, summary columns only. Name is fine.     │   │
│            │  │                                                         │   │
│            │  │  ─────────────────────────────────────────────────────  │   │
│            │  │                                                         │   │
│            │  │  🔄 Transformation Agent (now)                          │   │
│            │  │  Here's a preview on 5 sample rows:                    │   │
│            │  │                                                         │   │
│            │  │  ┌────────────┬───────────────┬─────────┬──────────┐   │   │
│            │  │  │customer_id │email          │orders_90│total_val │   │   │
│            │  │  ├────────────┼───────────────┼─────────┼──────────┤   │   │
│            │  │  │C-001       │john@acme.com  │12       │$4,521    │   │   │
│            │  │  │C-002       │mary@corp.io   │8        │$2,100    │   │   │
│            │  │  │C-003       │bob@mail.com   │23       │$12,450   │   │   │
│            │  │  └────────────┴───────────────┴─────────┴──────────┘   │   │
│            │  │                                                         │   │
│            │  │  Looks good? [✅ Execute] [🔄 Modify] [❌ Cancel]       │   │
│            │  │                                                         │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │ Type your message...                           [Send →] │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
└────────────┴────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Data Model

### Core Entities

```typescript
// Asset represents any data object in the ecosystem
interface Asset {
  id: string;
  name: string;
  type: AssetType;
  layer: DataLayer;
  
  // Descriptive
  description: string;
  businessContext: string;
  tags: string[];
  
  // Ownership
  owner: string;
  steward: string;
  
  // Lineage
  upstreamAssets: string[];
  downstreamAssets: string[];
  transformations: Transformation[];
  
  // Profiling
  profile: Profile;
  
  // Quality
  qualityRules: QualityRule[];
  qualityScore: number;
  lastValidated: Date;
  
  // Trust
  trustScore: TrustScore;
  fitnessStatus: 'green' | 'amber' | 'red';
  
  // Agent logs
  agentLogs: AgentLog[];
  
  // Issues
  relatedIssues: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

type AssetType = 
  | 'report' 
  | 'dashboard' 
  | 'table' 
  | 'view' 
  | 'api' 
  | 'file'
  | 'application_screen';

type DataLayer = 
  | 'consumer' 
  | 'gold' 
  | 'silver' 
  | 'bronze' 
  | 'raw';

// Profile captures statistical characteristics
interface Profile {
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  lastUpdated: Date;
  columns: ColumnProfile[];
}

interface ColumnProfile {
  name: string;
  dataType: string;
  inferredSemanticType: string;  // 'email', 'phone', 'date', etc.
  
  // Statistics
  nullCount: number;
  nullPercentage: number;
  distinctCount: number;
  distinctPercentage: number;
  
  // For numeric
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  
  // For string
  minLength: number;
  maxLength: number;
  avgLength: number;
  patterns: PatternFrequency[];
  
  // Value distribution
  topValues: ValueFrequency[];
}

// Quality rule definition
interface QualityRule {
  id: string;
  name: string;
  type: QualityRuleType;
  expression: string;  // SQL or Python expression
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Execution
  lastExecuted: Date;
  lastResult: QualityResult;
  passRate: number;
  
  // Metadata
  createdBy: string;  // agent or user
  rationale: string;
  autoGenerated: boolean;
}

type QualityRuleType = 
  | 'completeness' 
  | 'validity' 
  | 'consistency' 
  | 'timeliness' 
  | 'uniqueness' 
  | 'accuracy';

// Issue tracking
interface Issue {
  id: string;
  title: string;
  description: string;
  
  // Classification
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: IssueType;
  
  // Relationships
  affectedAssets: string[];
  rootCauseAsset: string;
  
  // Workflow
  status: IssueStatus;
  assignedTo: string;
  createdBy: string;  // agent name or user
  createdAt: Date;
  updatedAt: Date;
  
  // Resolution
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date;
  
  // Activity log
  activities: IssueActivity[];
}

type IssueType = 
  | 'anomaly' 
  | 'quality_failure' 
  | 'pipeline_failure' 
  | 'missing_data'
  | 'missing_reference'
  | 'ownership_missing'
  | 'freshness';

type IssueStatus = 
  | 'open'
  | 'investigating'
  | 'in_progress'
  | 'escalated'
  | 'pending_review'
  | 'resolved'
  | 'closed';

// Agent log entry
interface AgentLog {
  id: string;
  agentName: string;
  assetId: string;
  timestamp: Date;
  
  action: string;
  summary: string;
  details: Record<string, any>;
  
  // Ratings/assessments if applicable
  rating: string;
  score: number;
}

// Trust score breakdown
interface TrustScore {
  stars: number;  // 1-5
  rawScore: number;  // 0-1
  
  factors: {
    documentation: number;
    governance: number;
    quality: number;
    usage: number;
    reliability: number;
    freshness: number;
  };
  
  explanation: string;
  calculatedAt: Date;
}

// Transformation record
interface Transformation {
  id: string;
  name: string;
  type: 'etl' | 'script' | 'stored_procedure' | 'view_definition';
  
  sourceAssets: string[];
  targetAsset: string;
  
  logic: string;  // SQL, Python, or description
  schedule: string;  // cron expression if scheduled
  
  lastExecuted: Date;
  lastStatus: 'success' | 'failure';
}
```

### Database Schema (PostgreSQL/Supabase)

> **Note**: MVP uses Supabase (PostgreSQL) instead of Snowflake for faster iteration. The schema can be migrated to Snowflake for production if needed.

```sql
-- Assets catalog
CREATE TABLE amygdala.assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    layer TEXT NOT NULL,
    description TEXT,
    business_context TEXT,
    tags TEXT[] DEFAULT '{}',
    owner TEXT,
    steward TEXT,
    upstream_assets TEXT[] DEFAULT '{}',
    downstream_assets TEXT[] DEFAULT '{}',
    quality_score DECIMAL(5,2),
    trust_score_stars INTEGER,
    trust_score_raw DECIMAL(5,4),
    trust_explanation TEXT,
    fitness_status TEXT DEFAULT 'green',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Column profiles
CREATE TABLE amygdala.column_profiles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    column_name TEXT,
    data_type TEXT,
    inferred_semantic_type TEXT,
    null_count BIGINT,
    null_percentage DECIMAL(5,2),
    distinct_count BIGINT,
    distinct_percentage DECIMAL(5,2),
    min_value JSONB,
    max_value JSONB,
    mean_value DECIMAL(20,4),
    median_value DECIMAL(20,4),
    std_dev DECIMAL(20,4),
    min_length INTEGER,
    max_length INTEGER,
    avg_length DECIMAL(10,2),
    top_values JSONB DEFAULT '[]',
    patterns JSONB DEFAULT '[]',
    profiled_at TIMESTAMPTZ
);

-- Quality rules
CREATE TABLE amygdala.quality_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    name TEXT,
    rule_type TEXT,
    expression TEXT,
    severity TEXT,
    pass_rate DECIMAL(5,2),
    last_executed TIMESTAMPTZ,
    last_result JSONB,
    rationale TEXT,
    auto_generated BOOLEAN DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues
CREATE TABLE amygdala.issues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT,
    description TEXT,
    severity TEXT,
    issue_type TEXT,
    affected_assets TEXT[] DEFAULT '{}',
    root_cause_asset TEXT,
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ
);

-- Issue activities
CREATE TABLE amygdala.issue_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    issue_id TEXT REFERENCES amygdala.issues(id) ON DELETE CASCADE,
    actor TEXT,
    action TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent logs
CREATE TABLE amygdala.agent_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE SET NULL,
    action TEXT,
    summary TEXT,
    details JSONB,
    rating TEXT,
    score DECIMAL(5,2),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Lineage edges
CREATE TABLE amygdala.lineage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    target_asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    transformation_type TEXT,
    transformation_logic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots for historical comparison
CREATE TABLE amygdala.snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    snapshot_type TEXT,  -- 'metric', 'profile', 'distribution'
    snapshot_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformation scripts
CREATE TABLE amygdala.transformations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT,
    transformation_type TEXT,
    source_assets TEXT[] DEFAULT '{}',
    target_asset TEXT,
    logic TEXT,
    schedule TEXT,
    last_executed TIMESTAMPTZ,
    last_status TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security policies
ALTER TABLE amygdala.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.agent_logs ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_assets_layer ON amygdala.assets(layer);
CREATE INDEX idx_assets_type ON amygdala.assets(asset_type);
CREATE INDEX idx_issues_status ON amygdala.issues(status);
CREATE INDEX idx_issues_severity ON amygdala.issues(severity);
CREATE INDEX idx_agent_logs_agent ON amygdala.agent_logs(agent_name);
CREATE INDEX idx_agent_logs_asset ON amygdala.agent_logs(asset_id);
CREATE INDEX idx_snapshots_asset ON amygdala.snapshots(asset_id);
```

---

## Part 5: Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Establish core infrastructure and basic catalog

#### Week 1: Infrastructure Setup
- [ ] Set up Snowflake database with schema
- [ ] Create basic React application structure
- [ ] Implement authentication and user management
- [ ] Set up agent framework (scheduling, logging, state management)
- [ ] Create mock data generator for testing

#### Week 2: Basic Catalog
- [ ] Implement Asset CRUD operations
- [ ] Build catalog browser UI
- [ ] Create asset detail view
- [ ] Implement basic search and filtering
- [ ] Build initial profiling capabilities

**Deliverables**:
- Working application shell
- Database schema deployed
- Basic catalog functionality
- Asset browsing and detail views

---

### Phase 2: Documentarist Agent (Weeks 3-4)

**Goal**: Automated asset discovery and documentation

#### Week 3: Report Parser
- [ ] Build HTML report parser
- [ ] Extract visual elements (charts, tables, KPIs)
- [ ] Identify data sources from queries
- [ ] Create lineage tracing logic

#### Week 4: Profiling Integration
- [ ] Implement column profiling
- [ ] Build semantic type inference
- [ ] Create usage pattern detection
- [ ] Integrate with catalog updates

**Deliverables**:
- Documentarist agent operational
- Automatic report parsing
- Lineage graph generation
- Profiling results in catalog

---

### Phase 3: Spotter Agent (Weeks 5-6)

**Goal**: Anomaly detection and alerting

#### Week 5: Anomaly Detection
- [ ] Implement time series analysis
- [ ] Build value range monitoring
- [ ] Create distribution shift detection
- [ ] Develop freshness checking

#### Week 6: Alerting System
- [ ] Build snapshot comparison logic
- [ ] Implement severity classification
- [ ] Create alert routing
- [ ] Build notification system

**Deliverables**:
- Spotter agent operational
- Anomaly detection working
- Alert creation and routing
- Historical snapshot comparison

---

### Phase 4: Debugger & Quality Agents (Weeks 7-8)

**Goal**: Root cause analysis and quality validation

#### Week 7: Debugger Agent
- [ ] Implement lineage traversal for debugging
- [ ] Build pipeline status checking
- [ ] Create automated remediation actions
- [ ] Implement escalation logic

#### Week 8: Quality Agent
- [ ] Build rule generation engine
- [ ] Implement validation execution
- [ ] Create rule calibration logic
- [ ] Build quality scoring

**Deliverables**:
- Debugger agent operational
- Quality agent operational
- Automated rule generation
- Quality scores in catalog

---

### Phase 5: Transformation & Trust Agents (Weeks 9-10)

**Goal**: Data repair and trust scoring

#### Week 9: Transformation Agent
- [ ] Build transformation script generator
- [ ] Implement preview functionality
- [ ] Create execution framework
- [ ] Build chat interface for interactions

#### Week 10: Trust Agent
- [ ] Implement trust score calculation
- [ ] Build fitness assessment
- [ ] Create explanation generation
- [ ] Integrate scores into catalog

**Deliverables**:
- Transformation agent operational
- Trust agent operational
- Trust scores throughout catalog
- RAG indicators visible

---

### Phase 6: Integration & Polish (Weeks 11-12)

**Goal**: Full system integration and demo readiness

#### Week 11: Agent Orchestration
- [ ] Implement agent-to-agent triggers
- [ ] Build comprehensive logging
- [ ] Create agent command center UI
- [ ] Implement issue workflow automation

#### Week 12: Demo Preparation
- [ ] Create demo scenarios
- [ ] Build simulation framework
- [ ] Generate sample data with known issues
- [ ] Polish UI and fix bugs

**Deliverables**:
- Fully integrated system
- Demo scenarios working
- Simulation framework operational
- Production-ready MVP

---

## Part 6: Simulation Framework

### Purpose

The simulation framework creates realistic data scenarios with controlled issues to demonstrate Amygdala's capabilities.

### Components

#### 1. Data Generator

```python
class DataGenerator:
    """Generates realistic test data for the simulation."""
    
    def generate_customer_data(self, count: int) -> DataFrame:
        """Generate customer master data."""
        return DataFrame({
            'customer_id': [f'C-{i:05d}' for i in range(count)],
            'name': self.fake.name() for _ in range(count),
            'email': self._generate_emails(count),  # Mix of valid/invalid
            'phone': self._generate_phones(count),  # Mix of formats
            'address': self.fake.address() for _ in range(count),
            'created_date': self._generate_dates(count),
            'segment': self._generate_segments(count)
        })
    
    def generate_orders(self, customers: DataFrame, order_count: int) -> DataFrame:
        """Generate order transactions."""
        pass
    
    def generate_branch_reference(self) -> DataFrame:
        """Generate branch reference data with intentional gaps."""
        pass
```

#### 2. Issue Injector

```python
class IssueInjector:
    """Injects controlled issues into data for testing."""
    
    def inject_missing_data(self, df: DataFrame, 
                           column: str, 
                           percentage: float) -> DataFrame:
        """Make a percentage of values null."""
        pass
    
    def inject_format_issues(self, df: DataFrame,
                            column: str,
                            bad_format: str,
                            percentage: float) -> DataFrame:
        """Replace some values with bad formats."""
        pass
    
    def inject_anomalous_values(self, df: DataFrame,
                               column: str,
                               multiplier: float) -> DataFrame:
        """Create statistical outliers."""
        pass
    
    def inject_missing_reference(self, df: DataFrame,
                                column: str,
                                reference_table: DataFrame) -> DataFrame:
        """Add values not in reference table."""
        pass
```

#### 3. Pipeline Simulator

```python
class PipelineSimulator:
    """Simulates data pipeline behavior including failures."""
    
    def __init__(self, snowflake_conn):
        self.conn = snowflake_conn
        self.schedules = {}
    
    def register_pipeline(self, name: str, 
                         source_table: str,
                         target_table: str,
                         transformation: str,
                         schedule: str,
                         failure_rate: float = 0.1):
        """Register a pipeline for simulation."""
        pass
    
    def run_cycle(self):
        """Execute one simulation cycle."""
        for pipeline in self.schedules.values():
            if self._should_fail(pipeline.failure_rate):
                self._record_failure(pipeline)
            else:
                self._execute_pipeline(pipeline)
    
    def simulate_late_arrival(self, pipeline_name: str, delay_hours: int):
        """Simulate data arriving late."""
        pass
```

#### 4. Report Generator

```python
class ReportGenerator:
    """Generates HTML reports from data for testing."""
    
    def generate_revenue_report(self, orders_df: DataFrame) -> str:
        """Generate daily revenue HTML report."""
        template = self._load_template('revenue_report.html')
        
        # Aggregate data
        daily_revenue = orders_df.groupby('order_date').agg({
            'amount': 'sum',
            'order_id': 'count'
        })
        
        # Create charts
        revenue_chart = self._create_line_chart(daily_revenue['amount'])
        orders_chart = self._create_bar_chart(daily_revenue['order_id'])
        
        # Render
        return template.render(
            daily_revenue=daily_revenue,
            revenue_chart=revenue_chart,
            orders_chart=orders_chart,
            generated_at=datetime.now()
        )
    
    def generate_branch_performance_report(self, 
                                          orders_df: DataFrame,
                                          branches_df: DataFrame) -> str:
        """Generate branch performance report."""
        pass
```

### Demo Scenarios

#### Scenario 1: Missing Data Detection
1. Spotter monitors Daily Revenue Report
2. Pipeline fails, no data for today
3. Spotter creates critical alert
4. Debugger investigates, restarts pipeline
5. Data flows, issue resolved

#### Scenario 2: Anomaly Detection
1. Revenue suddenly drops 80%
2. Spotter detects statistical anomaly
3. Creates high-severity issue
4. Debugger traces to missing reference data
5. Adds missing branch, data corrects

#### Scenario 3: Quality Degradation
1. Quality Agent validates customer data
2. Detects 22% phone format failures
3. Creates medium-severity issue
4. Debugger traces to source system
5. Escalates to source owner

#### Scenario 4: User-Requested Transformation
1. User asks to create filtered dataset
2. Transformation Agent asks clarifying questions
3. Shows preview on sample
4. User approves, executes transformation
5. New asset appears in catalog with lineage

---

## Part 7: Technology Stack

> **Updated for MVP**: Using Next.js full-stack with Supabase, matching the seekwhy repository patterns.

### Full-Stack Framework
- **Framework**: Next.js 15 (App Router)
- **React**: React 19
- **Language**: TypeScript 5.7+
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **LLM Integration**: Claude API (Anthropic)
- **Background Jobs**: Inngest (serverless workflows)
- **Validation**: Zod

### Frontend
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives + custom components
- **Charts**: Recharts
- **Icons**: Lucide React
- **Theme**: Ataccama-inspired (purple/pink accents, Poppins font)

### Infrastructure
- **Deployment**: Vercel
- **Database Hosting**: Supabase
- **Edge Functions**: Supabase Functions (optional)
- **File Storage**: Supabase Storage

### Key Dependencies
```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "anthropic": "^0.35.0",
    "inngest": "^3.0.0",
    "zod": "^3.23.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  }
}
```

---

## Part 8: API Reference

### Asset Endpoints

```
GET    /api/assets                    List all assets
GET    /api/assets/:id                Get asset details
POST   /api/assets                    Create asset
PUT    /api/assets/:id                Update asset
DELETE /api/assets/:id                Delete asset
GET    /api/assets/:id/profile        Get asset profile
GET    /api/assets/:id/lineage        Get asset lineage
GET    /api/assets/:id/issues         Get related issues
GET    /api/assets/:id/logs           Get agent logs
```

### Agent Endpoints

```
GET    /api/agents                    List all agents
GET    /api/agents/:name/status       Get agent status
POST   /api/agents/:name/run          Trigger agent run
POST   /api/agents/:name/chat         Chat with agent
GET    /api/agents/:name/logs         Get agent logs
```

### Issue Endpoints

```
GET    /api/issues                    List all issues
GET    /api/issues/:id                Get issue details
POST   /api/issues                    Create issue
PUT    /api/issues/:id                Update issue
POST   /api/issues/:id/assign         Assign issue
POST   /api/issues/:id/resolve        Resolve issue
```

### Quality Endpoints

```
GET    /api/quality/rules             List all rules
POST   /api/quality/rules             Create rule
POST   /api/quality/validate/:assetId Run validation
GET    /api/quality/results/:assetId  Get validation results
```

---

## Part 9: Success Metrics

### MVP Success Criteria

1. **Documentarist**: Can parse 3+ HTML reports and trace lineage to source tables
2. **Spotter**: Detects 5+ predefined anomaly patterns with <10% false positive rate
3. **Debugger**: Successfully auto-remediates 2+ issue types (pipeline restart, reference data)
4. **Quality Agent**: Generates meaningful rules for 80%+ of profiled columns
5. **Transformation Agent**: Completes 3+ different transformation types via chat
6. **Trust Agent**: Produces consistent, explainable trust scores

### Demo Readiness Checklist

- [ ] All 6 agents operational
- [ ] Agent Command Center functional
- [ ] Catalog browser with trust indicators
- [ ] Issue tracking working
- [ ] At least 3 demo scenarios scripted
- [ ] Simulation framework generating controlled issues
- [ ] UI polished and responsive

---

## Part 10: Glossary

| Term | Definition |
|------|------------|
| **Asset** | Any data object (report, table, file) tracked in the catalog |
| **Layer** | Position in data architecture (consumer, gold, silver, bronze, raw) |
| **Lineage** | The upstream/downstream relationships between assets |
| **Profile** | Statistical characteristics of a data asset |
| **Quality Rule** | A validation check that data must pass |
| **Trust Score** | Holistic 1-5 star rating of asset trustworthiness |
| **Fitness Status** | RAG indicator of current usability (green/amber/red) |
| **Issue** | A tracked problem affecting data quality or availability |
| **Agent** | Autonomous AI component with specific responsibilities |
| **Spotter** | Agent that detects anomalies in reports |
| **Debugger** | Agent that investigates and fixes issues |
| **Documentarist** | Agent that catalogs and profiles assets |

---

## Appendix A: Sample HTML Report Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>Daily Revenue Report</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 40px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .kpi-card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
        .kpi-value { font-size: 32px; font-weight: bold; color: #1a1f36; }
        .kpi-label { color: #666; margin-top: 8px; }
        .chart-container { margin: 40px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <h1>Daily Revenue Report</h1>
    <p>Generated: {{ generated_at }}</p>
    
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${{ total_revenue | format_number }}</div>
            <div class="kpi-label">Total Revenue (Today)</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">{{ order_count }}</div>
            <div class="kpi-label">Orders</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${{ avg_order_value | format_number }}</div>
            <div class="kpi-label">Avg Order Value</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">{{ change_percentage }}%</div>
            <div class="kpi-label">vs Yesterday</div>
        </div>
    </div>
    
    <div class="chart-container">
        <h2>Revenue Trend (Last 30 Days)</h2>
        <div id="revenue-chart">{{ revenue_chart }}</div>
    </div>
    
    <div class="chart-container">
        <h2>Revenue by Branch</h2>
        <div id="branch-chart">{{ branch_chart }}</div>
    </div>
    
    <h2>Top Products</h2>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
            </tr>
        </thead>
        <tbody>
            {% for product in top_products %}
            <tr>
                <td>{{ product.name }}</td>
                <td>{{ product.units }}</td>
                <td>${{ product.revenue | format_number }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    
    <!-- Data source metadata for Documentarist -->
    <script type="application/json" id="report-metadata">
    {
        "data_sources": [
            {"table": "gold.orders", "query": "SELECT * FROM gold.orders WHERE order_date = CURRENT_DATE"},
            {"table": "gold.products", "query": "SELECT * FROM gold.products"},
            {"table": "ref.branches", "query": "SELECT * FROM ref.branches"}
        ],
        "refresh_schedule": "daily at 06:00 UTC",
        "owner": "finance@acme.com"
    }
    </script>
</body>
</html>
```

---

## Appendix B: Agent Prompt Templates

### Documentarist System Prompt

```
You are the Documentarist agent for the Amygdala data trust platform. Your role is to 
discover, document, and profile data assets.

When analyzing a report:
1. Identify all visual elements (charts, tables, KPIs)
2. Determine what data they display
3. Trace back to source tables
4. Document the lineage

When profiling a table:
1. Calculate statistical characteristics
2. Infer semantic types (email, phone, date, etc.)
3. Identify patterns and anomalies
4. Generate meaningful descriptions

Always create catalog entries with:
- Clear, business-relevant descriptions
- Accurate lineage information
- Useful profiling statistics
- Tags based on content and usage

If you find an asset without an owner, create an issue for ownership assignment.
```

### Spotter System Prompt

```
You are the Spotter agent for the Amygdala data trust platform. Your role is to detect 
anomalies that would make humans say "I don't trust this data."

Monitor reports for these patterns:
1. Missing data (expected values not present)
2. Value anomalies (statistical outliers)
3. Distribution shifts (proportions changed)
4. Freshness issues (stale data)
5. Completeness issues (missing categories)

When you detect an anomaly:
1. Classify severity (critical, high, medium, low)
2. Assess confidence (high, possible, uncertain)
3. Estimate impact (which reports/users affected)
4. Create an issue with clear description
5. Optionally trigger Debugger for critical issues

Compare current data against historical baselines. Store snapshots for future comparison.
Be vigilant but avoid false positives - aim for high-confidence detections.
```

### Quality Agent System Prompt

```
You are the Quality Agent for the Amygdala data trust platform. Your role is to define 
and enforce data quality rules.

When generating rules for an asset:
1. Analyze catalog metadata and profiling results
2. Consider how the data is used downstream
3. Generate rules appropriate to the context

Rule categories:
- Completeness: required fields not null
- Validity: formats match expectations
- Consistency: cross-column logic
- Timeliness: data is fresh
- Uniqueness: no duplicates
- Accuracy: business logic satisfied

For each rule:
1. Implement as SQL or Python expression
2. Test against sample data
3. Calibrate to minimize false positives
4. Document rationale

When issues are found, determine if they can be auto-fixed by Transformation Agent,
or if they require escalation to data owners.
```

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude (Anthropic)*
