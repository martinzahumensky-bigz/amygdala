# FEAT-013: Amygdala MCP Server Specification
## AI Agent Data Trust Layer

> **Status:** Draft
> **Version:** 1.0
> **Last Updated:** 2026-01-27

---

## Executive Summary

The Amygdala MCP (Model Context Protocol) Server is a critical integration layer that bridges AI agentic systems with trusted enterprise data. It addresses the fundamental problem that **AI agents today operate blind to data quality, freshness, and trustworthiness**—leading to confident-sounding but wrong answers.

This specification outlines how Amygdala becomes the "data conscience" for AI agents, injecting trust context into every data interaction and enabling a feedback loop where agents can report suspected anomalies.

---

## The Problem: AI Agents and Data Trust Gap

### Current State of AI + Data

When AI agents (Claude, GPT, etc.) query enterprise data today, they face critical blind spots:

| Problem | Impact | Example |
|---------|--------|---------|
| **No quality awareness** | Agent treats bad data as good | Returns customer phone that's actually "BAD-12345" |
| **No freshness context** | Uses stale data as current | Reports yesterday's revenue when pipeline failed |
| **No issue awareness** | Ignores known problems | Queries asset with critical open issue |
| **False confidence** | Presents uncertain data as fact | "Revenue is $2.3M" when data is incomplete |
| **No semantic understanding** | Misinterprets business meaning | Includes test branches in production report |
| **No lineage knowledge** | Can't explain data provenance | "I don't know where this data came from" |
| **No feedback loop** | Can't report anomalies | Spots issue but has no way to flag it |

### The Demonstration Contrast

**Scenario: "What was yesterday's total revenue by branch?"**

#### WITHOUT Amygdala MCP:
```
User: What was yesterday's total revenue by branch?

Claude: Based on the data, yesterday's total revenue by branch was:
- Downtown Main: $450,000
- Westside Center: $380,000
- Airport Branch: $320,000
- BR-WEST-042: $45,000

Total: $1,195,000

The highest performing branch was Downtown Main with $450,000 in revenue.
```

**Problems:**
1. Data was actually incomplete (pipeline failed at 2 AM)
2. BR-WEST-042 isn't in reference data (unknown branch)
3. Agent presented incomplete data with full confidence
4. No warning about data quality issues

#### WITH Amygdala MCP:
```
User: What was yesterday's total revenue by branch?

Claude: I need to flag some data quality concerns before answering:

⚠️ **Trust Warning:** The revenue data for yesterday has the following issues:
- **Data Freshness:** Pipeline `load_core_transactions` failed at 02:00 AM.
  Data may be incomplete for yesterday.
- **Trust Score:** gold_daily_revenue is currently rated 2.3/5 stars (RED status)
- **Active Issue:** #1289 "Revenue data missing for East region" (critical, investigating)

Given these issues, I can provide what data IS available, but it's incomplete:
- Downtown Main: $450,000
- Westside Center: $380,000
- Airport Branch: $320,000
- ⚠️ BR-WEST-042: $45,000 (Unknown branch - not in reference data)

**Partial Total: $1,195,000** (likely missing ~$800K from East region based on historical patterns)

**Recommendation:** Wait for Issue #1289 to be resolved before making decisions based on this data. The Debugger agent is currently investigating.

Would you like me to:
1. Show you the historical average for comparison?
2. Alert you when the data is complete?
3. Report any additional anomalies I've noticed?
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AI APPLICATION                                   │
│                     (Claude Code, Claude Desktop, etc.)                       │
└─────────────────────────────────────────────┬───────────────────────────────┘
                                              │
                                              │ MCP Protocol
                                              │
┌─────────────────────────────────────────────▼───────────────────────────────┐
│                         AMYGDALA MCP SERVER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        TRUST CONTEXT LAYER                           │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐│    │
│  │  │ Trust Score  │ │ Issue        │ │ Freshness    │ │ Lineage     ││    │
│  │  │ Calculator   │ │ Checker      │ │ Monitor      │ │ Resolver    ││    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         MCP TOOL HANDLERS                            │    │
│  │  • amygdala_query         • amygdala_get_trust_score                │    │
│  │  • amygdala_check_issues  • amygdala_get_lineage                    │    │
│  │  • amygdala_report_anomaly • amygdala_get_freshness                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CONTEXT INJECTION ENGINE                          │    │
│  │  Automatically enriches query results with trust metadata            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────┬───────────────────────────────┘
                                              │
                                              │ Database Queries
                                              │
┌─────────────────────────────────────────────▼───────────────────────────────┐
│                         AMYGDALA PLATFORM                                     │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐     │
│  │  Assets   │ │  Issues   │ │   Agent   │ │ Snapshots │ │   Trust   │     │
│  │  Catalog  │ │  Tracker  │ │   Logs    │ │   Store   │ │  Scores   │     │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘     │
└─────────────────────────────────────────────┬───────────────────────────────┘
                                              │
┌─────────────────────────────────────────────▼───────────────────────────────┐
│                        MERIDIAN DATA WAREHOUSE                               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐                   │
│  │  Bronze   │ │  Silver   │ │   Gold    │ │ Consumer  │                   │
│  │   Layer   │ │   Layer   │ │   Layer   │ │   Layer   │                   │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MCP Server Tools

### 1. `amygdala_query`

**Purpose:** Execute data queries with automatic trust context injection.

```typescript
interface AmygdalaQueryInput {
  // The data query to execute
  query: string;

  // Query type
  queryType: 'sql' | 'natural_language';

  // Target asset(s) - if known
  targetAssets?: string[];

  // Minimum trust threshold (optional)
  minTrustScore?: number;  // 1-5, queries below this will warn

  // Include full trust context in response
  includeTrustContext?: boolean;  // default: true
}

interface AmygdalaQueryOutput {
  // The actual data results
  data: Record<string, any>[];

  // Trust context for the query
  trustContext: {
    // Overall trust assessment for this query
    overallTrust: 'high' | 'medium' | 'low' | 'critical';
    overallScore: number;  // 1-5

    // Assets involved in this query
    assetsQueried: Array<{
      name: string;
      trustScore: number;
      fitnessStatus: 'green' | 'amber' | 'red';
      lastUpdated: string;
      activeIssueCount: number;
    }>;

    // Warnings to surface to the AI
    warnings: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      message: string;
      relatedIssue?: string;  // Issue ID if applicable
    }>;

    // Recommendations for the AI
    recommendations: string[];

    // Data freshness info
    freshness: {
      oldestDataPoint: string;  // ISO timestamp
      expectedRefresh: string;
      isStale: boolean;
    };
  };

  // Lineage summary
  lineage?: {
    sources: string[];
    transformations: string[];
  };
}
```

**Example Usage:**
```json
{
  "tool": "amygdala_query",
  "input": {
    "query": "SELECT branch_id, SUM(amount) as revenue FROM gold_daily_revenue WHERE date = CURRENT_DATE - 1 GROUP BY branch_id",
    "queryType": "sql",
    "includeTrustContext": true
  }
}
```

**Example Response:**
```json
{
  "data": [
    {"branch_id": "BR-001", "revenue": 450000},
    {"branch_id": "BR-002", "revenue": 380000},
    {"branch_id": "BR-WEST-042", "revenue": 45000}
  ],
  "trustContext": {
    "overallTrust": "low",
    "overallScore": 2.3,
    "assetsQueried": [{
      "name": "gold_daily_revenue",
      "trustScore": 2.3,
      "fitnessStatus": "red",
      "lastUpdated": "2026-01-26T02:15:00Z",
      "activeIssueCount": 2
    }],
    "warnings": [
      {
        "severity": "critical",
        "message": "Pipeline load_core_transactions failed. Yesterday's data may be incomplete.",
        "relatedIssue": "1289"
      },
      {
        "severity": "high",
        "message": "Branch BR-WEST-042 not found in reference data. May be test data or new branch.",
        "relatedIssue": "1291"
      }
    ],
    "recommendations": [
      "Wait for Issue #1289 to be resolved before using this data for decisions",
      "Verify BR-WEST-042 is a valid production branch before including"
    ],
    "freshness": {
      "oldestDataPoint": "2026-01-26T02:15:00Z",
      "expectedRefresh": "2026-01-27T05:00:00Z",
      "isStale": true
    }
  }
}
```

---

### 2. `amygdala_get_trust_score`

**Purpose:** Get detailed trust score for a specific asset.

```typescript
interface GetTrustScoreInput {
  assetName: string;
  includeFactorBreakdown?: boolean;  // default: true
  includeRecommendations?: boolean;  // default: true
}

interface GetTrustScoreOutput {
  assetName: string;
  trustScore: {
    stars: number;  // 1-5
    rawScore: number;  // 0-1
    fitnessStatus: 'green' | 'amber' | 'red';
  };
  factors?: {
    documentation: { score: number; reasons: string[] };
    governance: { score: number; reasons: string[] };
    quality: { score: number; reasons: string[] };
    usage: { score: number; reasons: string[] };
    reliability: { score: number; reasons: string[] };
    freshness: { score: number; reasons: string[] };
  };
  explanation: string;
  recommendations?: string[];
  relatedIssues: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
  }>;
}
```

---

### 3. `amygdala_check_issues`

**Purpose:** Check for active issues affecting an asset or data area.

```typescript
interface CheckIssuesInput {
  // Asset name OR query/topic to check
  assetName?: string;
  topic?: string;  // e.g., "revenue", "customer data"

  // Filter options
  severityFilter?: ('critical' | 'high' | 'medium' | 'low')[];
  statusFilter?: ('open' | 'investigating' | 'in_progress')[];

  // Include upstream/downstream issues
  includeRelatedAssets?: boolean;
}

interface CheckIssuesOutput {
  hasBlockingIssues: boolean;
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    affectedAssets: string[];
    assignedTo: string;
    debuggerStatus?: string;  // If Debugger agent is investigating
  }>;
  recommendation: string;
}
```

---

### 4. `amygdala_get_lineage`

**Purpose:** Understand data provenance and transformation history.

```typescript
interface GetLineageInput {
  assetName: string;
  direction?: 'upstream' | 'downstream' | 'both';
  depth?: number;  // How many levels to trace (default: 3)
}

interface GetLineageOutput {
  assetName: string;
  layer: string;
  upstream: Array<{
    assetName: string;
    layer: string;
    transformation: string;
    trustScore: number;
    hasActiveIssues: boolean;
  }>;
  downstream: Array<{
    assetName: string;
    layer: string;
    transformation: string;
    trustScore: number;
  }>;
  transformationLogic?: string;  // SQL or description
  fullLineageGraph?: object;  // For visualization
}
```

---

### 5. `amygdala_report_anomaly`

**Purpose:** Allow AI to report suspected data anomalies back to Amygdala.

```typescript
interface ReportAnomalyInput {
  // What asset is affected
  assetName: string;

  // Type of anomaly detected
  anomalyType:
    | 'value_anomaly'      // Unexpected values
    | 'missing_data'       // Expected data not present
    | 'format_issue'       // Data format problems
    | 'inconsistency'      // Cross-column/table inconsistency
    | 'freshness_concern'  // Data seems stale
    | 'semantic_issue'     // Business logic violation
    | 'other';

  // Description of what was observed
  description: string;

  // Evidence
  evidence?: {
    query?: string;
    sampleData?: any;
    expectedBehavior?: string;
    actualBehavior?: string;
  };

  // Suggested severity
  suggestedSeverity?: 'critical' | 'high' | 'medium' | 'low';

  // AI confidence in this report
  confidence: 'high' | 'medium' | 'low';
}

interface ReportAnomalyOutput {
  reported: boolean;
  issueId?: string;  // If an issue was created
  message: string;
  nextSteps: string[];  // What will happen next
}
```

**Example:**
```json
{
  "tool": "amygdala_report_anomaly",
  "input": {
    "assetName": "gold_daily_revenue",
    "anomalyType": "value_anomaly",
    "description": "Revenue for branch BR-003 is $5.2M yesterday, but historical average is $400K. This is a 1300% increase which seems implausible.",
    "evidence": {
      "query": "SELECT date, revenue FROM gold_branch_metrics WHERE branch_id = 'BR-003' ORDER BY date DESC LIMIT 30",
      "expectedBehavior": "Daily revenue around $350K-$450K based on last 30 days",
      "actualBehavior": "$5,200,000 for yesterday"
    },
    "suggestedSeverity": "critical",
    "confidence": "high"
  }
}
```

---

### 6. `amygdala_get_freshness`

**Purpose:** Check data freshness and refresh schedules.

```typescript
interface GetFreshnessInput {
  assetName: string;
  includeUpstream?: boolean;  // Check freshness of sources too
}

interface GetFreshnessOutput {
  assetName: string;
  lastUpdated: string;
  expectedRefreshFrequency: string;  // e.g., "daily", "hourly"
  nextExpectedRefresh: string;
  isFresh: boolean;
  staleness?: {
    hoursOverdue: number;
    reason?: string;
    relatedIssue?: string;
  };
  upstreamFreshness?: Array<{
    assetName: string;
    lastUpdated: string;
    isFresh: boolean;
  }>;
  recommendation: string;
}
```

---

## Context Injection Engine

The Context Injection Engine automatically enriches all query results with relevant trust metadata. This happens transparently so the AI always has context.

### Injection Rules

```typescript
interface InjectionRules {
  // Always include trust score for queried assets
  alwaysIncludeTrustScore: true;

  // Warning thresholds
  warnings: {
    // Warn if trust score below this
    lowTrustThreshold: 3;

    // Warn if data older than this (hours)
    stalenessThreshold: 24;

    // Always warn if asset has critical issues
    alwaysWarnOnCriticalIssues: true;

    // Warn on amber fitness status
    warnOnAmberStatus: true;
  };

  // What to include
  includes: {
    activeIssues: true;
    freshnesInfo: true;
    lineageSummary: true;  // For complex queries
    recommendations: true;
  };
}
```

### Injection Examples

**Simple Query:**
```
AI requests: "What is the total customer count?"

Amygdala returns:
- Data: { totalCustomers: 5247 }
- Trust Context:
  - Asset: silver_customers
  - Trust: 4.2/5 (GREEN)
  - Last Updated: 2h ago
  - No active issues
```

**Complex Multi-Asset Query:**
```
AI requests: "Show revenue by customer segment with customer counts"

Amygdala returns:
- Data: [{ segment: "Premium", revenue: 1.2M, customers: 423 }, ...]
- Trust Context:
  - Assets queried:
    - gold_daily_revenue (3.8/5, AMBER)
    - gold_customer_360 (4.1/5, GREEN)
  - Warnings:
    - "gold_daily_revenue has 1 medium-severity issue"
  - Overall Trust: MEDIUM
  - Recommendation: "Revenue figures may be slightly incomplete. Customer data is reliable."
```

---

## Demo Scenarios

### Demo 1: The Confident Wrong Answer

**Setup:** Pipeline failure caused missing revenue data.

**Without Amygdala:**
1. User asks Claude: "What was Q4 revenue?"
2. Claude queries data, gets partial results
3. Claude confidently reports: "Q4 revenue was $45.2M"
4. Reality: Actual Q4 revenue was $52.1M (December data missing)

**With Amygdala:**
1. User asks Claude: "What was Q4 revenue?"
2. Claude calls `amygdala_query`
3. Amygdala returns data + trust context showing December data is incomplete
4. Claude responds: "Based on available data, Q4 revenue appears to be $45.2M, **however** I need to flag that December data is incomplete due to Issue #1289. Historical patterns suggest the true total may be ~$51-53M. I recommend waiting for data completion."

### Demo 2: The Reference Data Gap

**Setup:** New branch added but not in reference tables.

**Without Amygdala:**
1. User asks: "Show performance by branch"
2. Claude queries, includes row with branch_id "BR-NEW-001"
3. Claude presents data without context
4. User confused about unknown branch code

**With Amygdala:**
1. User asks: "Show performance by branch"
2. Amygdala detects BR-NEW-001 not in reference data
3. Warning injected: "Branch BR-NEW-001 not found in reference data"
4. Claude explains: "Most branches are performing well. Note: there's one entry for 'BR-NEW-001' which isn't in our branch reference data - this may be a new branch that needs to be registered, or possibly test data. I've reported this to the Debugger agent."

### Demo 3: AI-Initiated Anomaly Reporting

**Setup:** AI spots unusual pattern while answering question.

1. User asks: "What's the trend in loan defaults?"
2. Claude queries loan data
3. Claude notices default rate jumped from 2% to 18% in one month
4. Claude calls `amygdala_report_anomaly` with high confidence
5. Claude responds: "I've noticed an unusual pattern - default rates jumped from 2% to 18% between November and December. I've reported this anomaly to the Amygdala platform for investigation. This could be a data quality issue or a genuine business concern that warrants attention."
6. Amygdala creates issue, Spotter confirms anomaly, Debugger investigates

### Demo 4: Trust-Aware Decision Support

**Setup:** User asking for data to make business decision.

1. User asks: "Based on customer data, which segment should we target for the new product?"
2. Claude calls `amygdala_query` for customer segment analysis
3. Amygdala returns data with trust context
4. Claude responds:
   - "Based on the data, Premium segment shows highest engagement (confidence: HIGH, data trust: 4.5/5)"
   - "SMB segment shows growth potential, but note the customer data for this segment has 15% invalid phone numbers (Issue #1247) which may affect outreach planning"
   - "Enterprise segment data is currently unreliable (trust: 2.1/5, RED) due to ongoing data migration - I'd recommend waiting before making decisions about this segment"

---

## Implementation Plan

### Phase 1: Core MCP Server (Week 1)

- [ ] Set up MCP server structure using TypeScript SDK
- [ ] Implement `amygdala_query` with basic trust injection
- [ ] Implement `amygdala_get_trust_score`
- [ ] Connect to Supabase for data queries
- [ ] Basic trust context calculation

### Phase 2: Full Tool Suite (Week 2)

- [ ] Implement `amygdala_check_issues`
- [ ] Implement `amygdala_get_lineage`
- [ ] Implement `amygdala_get_freshness`
- [ ] Implement `amygdala_report_anomaly`
- [ ] Add anomaly → Issue creation workflow

### Phase 3: Context Injection Engine (Week 3)

- [ ] Build automatic context injection logic
- [ ] Implement warning rules engine
- [ ] Add recommendation generation
- [ ] Multi-asset query handling

### Phase 4: Demo & Polish (Week 4)

- [ ] Build demo scenarios with injected issues
- [ ] Create comparison documentation
- [ ] Record demo videos (with vs without)
- [ ] Integration testing with Claude Desktop

---

## Technical Implementation

### MCP Server Structure

```
packages/amygdala-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   ├── query.ts          # amygdala_query handler
│   │   ├── trust-score.ts    # amygdala_get_trust_score handler
│   │   ├── issues.ts         # amygdala_check_issues handler
│   │   ├── lineage.ts        # amygdala_get_lineage handler
│   │   ├── freshness.ts      # amygdala_get_freshness handler
│   │   └── report-anomaly.ts # amygdala_report_anomaly handler
│   ├── context/
│   │   ├── injection-engine.ts
│   │   ├── trust-calculator.ts
│   │   └── warning-rules.ts
│   ├── db/
│   │   ├── supabase-client.ts
│   │   └── queries.ts
│   └── types/
│       └── index.ts
├── package.json
└── README.md
```

### Key Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "zod": "^3.23.0"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Trust context injection rate | 100% of queries |
| False confidence prevention | Demonstrate in 5+ scenarios |
| Anomaly report → Issue creation | < 5 seconds |
| Demo clarity | Non-technical audience understands value |
| Query latency overhead | < 200ms additional |

---

## Appendix: MCP Configuration

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "amygdala": {
      "command": "npx",
      "args": ["@amygdala/mcp-server"],
      "env": {
        "SUPABASE_URL": "https://xfcqszmaoxiilzudvguy.supabase.co",
        "SUPABASE_ANON_KEY": "..."
      }
    }
  }
}
```

### Server Manifest

```json
{
  "name": "amygdala-mcp",
  "version": "1.0.0",
  "description": "Data Trust Layer for AI Agents",
  "tools": [
    {
      "name": "amygdala_query",
      "description": "Query data with automatic trust context injection. Returns data plus trust scores, active issues, freshness info, and recommendations."
    },
    {
      "name": "amygdala_get_trust_score",
      "description": "Get detailed trust score breakdown for a data asset."
    },
    {
      "name": "amygdala_check_issues",
      "description": "Check for active data quality issues affecting an asset or topic."
    },
    {
      "name": "amygdala_get_lineage",
      "description": "Understand data provenance - where data comes from and what depends on it."
    },
    {
      "name": "amygdala_report_anomaly",
      "description": "Report a suspected data anomaly for investigation by Amygdala agents."
    },
    {
      "name": "amygdala_get_freshness",
      "description": "Check when data was last updated and if it meets freshness requirements."
    }
  ]
}
```

---

*This specification defines the Amygdala MCP Server—the bridge between AI agents and trusted enterprise data.*
