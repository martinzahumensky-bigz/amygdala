# FEAT-015: Mastering Agent
## Intelligent Data Matching, Merging & Deduplication

> **Status:** Draft
> **Version:** 1.0
> **Last Updated:** 2026-01-27

---

## Executive Summary

The **Mastering Agent** is a new AI-powered agent that helps users match, merge, and deduplicate data from multiple sources. Unlike traditional MDM tools that require extensive rule configuration, the Mastering Agent uses profiling metadata and AI reasoning to **automatically devise matching rules**, then guides users through an interactive merge workflow.

**Key Innovation:** Natural language input like "Match Salesforce accounts with HubSpot companies" triggers an intelligent pipeline that:
1. Profiles both sources to understand the data
2. Uses AI to devise probabilistic matching rules
3. Executes matching with confidence scores
4. Presents results in an interactive UI for human validation
5. Creates a "golden master record" with full lineage

---

## The Problem

### Manual Data Matching is Painful

```
User request: "I need to combine our Salesforce accounts with HubSpot contacts"

Traditional approach:
1. Export Salesforce to CSV ← manual
2. Export HubSpot to CSV ← manual
3. Open in Excel ← error-prone
4. Try VLOOKUP on company name ← fails on variations
5. Manually review 5,000 records ← days of work
6. Paste results back ← no lineage
7. Repeat when data changes ← nightmare
```

### Common Challenges

| Challenge | Impact |
|-----------|--------|
| **Name variations** | "Acme Corp" vs "ACME Corporation Inc" |
| **Missing fields** | No email in one system, no phone in other |
| **Duplicate records** | Same entity appears multiple times |
| **Conflicting values** | Different addresses, which is right? |
| **No confidence scores** | Is this a true match or false positive? |
| **No lineage** | Where did this merged record come from? |

---

## Solution: Mastering Agent

### Conversation-Driven Matching

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 MASTERING AGENT CHAT                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  👤 You:                                                                     │
│  I want to match and merge our Salesforce accounts with HubSpot companies.  │
│  We need a unified customer view.                                           │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  🎯 Mastering Agent:                                                        │
│  I'll help you create a unified customer master. Let me first understand   │
│  both data sources.                                                          │
│                                                                              │
│  📊 **Profiling Results:**                                                  │
│                                                                              │
│  | Attribute | Salesforce | HubSpot | Match Potential |                    │
│  |-----------|------------|---------|-----------------|                    │
│  | Company   | 100% fill  | 98% fill| ⭐ Primary key  |                    │
│  | Domain    | 45% fill   | 92% fill| ⭐ High value   |                    │
│  | Phone     | 78% fill   | 34% fill| 🔸 Secondary    |                    │
│  | Address   | 89% fill   | 67% fill| 🔸 Validation   |                    │
│  | Industry  | 95% fill   | 88% fill| 🔸 Validation   |                    │
│                                                                              │
│  Based on this, I recommend a **3-stage matching strategy**:                │
│                                                                              │
│  1️⃣ **Exact domain match** (highest confidence)                            │
│  2️⃣ **Fuzzy company name match** (medium confidence)                       │
│  3️⃣ **Phone + location match** (lower confidence, for validation)         │
│                                                                              │
│  Should I proceed with this strategy, or would you like to adjust?         │
│                                                                              │
│  [✅ Proceed] [🔧 Adjust Rules] [📊 Show Sample Matches]                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MASTERING AGENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    USER INTERFACE LAYER                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Chat         │  │ Match Review │  │ Merge        │              │   │
│  │  │ Interface    │  │ Dashboard    │  │ Workspace    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MASTERING AGENT CORE                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Source       │  │ Rule         │  │ Match        │              │   │
│  │  │ Profiler     │  │ Generator    │  │ Engine       │              │   │
│  │  │ (Understand) │  │ (AI-Powered) │  │ (Splink)     │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  │         │                 │                 │                       │   │
│  │         └─────────────────┼─────────────────┘                       │   │
│  │                           │                                         │   │
│  │  ┌────────────────────────▼────────────────────────────────────┐   │   │
│  │  │                  ORCHESTRATION ENGINE                        │   │   │
│  │  │                                                              │   │   │
│  │  │  1. Profile sources     4. Execute matching                 │   │   │
│  │  │  2. Generate rules      5. Calculate confidence             │   │   │
│  │  │  3. Validate strategy   6. Present for review               │   │   │
│  │  └────────────────────────┬────────────────────────────────────┘   │   │
│  │                           │                                         │   │
│  │  ┌────────────────────────▼────────────────────────────────────┐   │   │
│  │  │                  SURVIVORSHIP ENGINE                         │   │   │
│  │  │                                                              │   │   │
│  │  │  • Conflict resolution rules                                 │   │   │
│  │  │  • Golden record construction                                │   │   │
│  │  │  • Lineage tracking                                          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Source A     │  │ Source B     │  │ Master       │              │   │
│  │  │ (Salesforce) │  │ (HubSpot)    │  │ Records      │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Source Profiler

Analyzes each data source to understand matching potential.

```typescript
interface SourceProfile {
  sourceName: string;
  recordCount: number;
  columns: ColumnProfile[];
  matchingPotential: MatchingPotential;
}

interface ColumnProfile {
  name: string;
  dataType: string;
  fillRate: number;       // % non-null
  uniqueness: number;     // % unique values
  patterns: string[];     // Detected patterns
  semanticType: SemanticType;  // 'company_name', 'email', 'phone', etc.
  sampleValues: string[];
  qualityIssues: string[];
}

interface MatchingPotential {
  recommendedKeys: Array<{
    columns: string[];
    confidence: number;
    reasoning: string;
  }>;
  challenges: string[];
  estimatedMatchRate: number;
}
```

### 2. AI Rule Generator

Uses Claude to generate matching rules based on profiling.

```typescript
interface MatchingStrategy {
  name: string;
  description: string;
  stages: MatchingStage[];
  estimatedAccuracy: number;
  estimatedRuntime: string;
}

interface MatchingStage {
  order: number;
  name: string;
  type: 'exact' | 'fuzzy' | 'probabilistic';
  rules: MatchingRule[];
  expectedYield: number;  // % of records expected to match
  confidenceThreshold: number;
}

interface MatchingRule {
  leftColumn: string;
  rightColumn: string;
  matchType: MatchType;
  weight: number;
  parameters?: Record<string, any>;
}

type MatchType =
  | 'exact'               // Exact string match
  | 'exact_lowercase'     // Case-insensitive
  | 'levenshtein'         // Edit distance
  | 'jaro_winkler'        // Name similarity
  | 'soundex'             // Phonetic
  | 'domain_match'        // Email domain
  | 'token_overlap'       // Word overlap
  | 'numeric_range';      // Within tolerance
```

**Claude Rule Generation Prompt:**

```
You are the Mastering Agent for Amygdala. Your task is to devise optimal
matching rules for linking records between two data sources.

Given the profiling results for both sources:

Source A (Salesforce):
{sourceA_profile}

Source B (HubSpot):
{sourceB_profile}

Generate a matching strategy that:
1. Prioritizes high-confidence matches first (exact domain, exact ID)
2. Falls back to fuzzy matching for remaining records
3. Uses multiple attributes for validation
4. Avoids false positives

Consider:
- Column fill rates (low fill = less reliable for matching)
- Semantic types (company names need fuzzy, domains can be exact)
- Data quality issues identified in profiling

Return a JSON matching strategy with stages, rules, and confidence thresholds.
```

### 3. Match Engine (Splink-Inspired)

Executes probabilistic matching using proven techniques.

```typescript
interface MatchResult {
  matchId: string;
  leftRecordId: string;
  rightRecordId: string;
  matchScore: number;        // 0-100
  confidence: 'high' | 'medium' | 'low';
  matchedOn: Array<{
    rule: string;
    leftValue: string;
    rightValue: string;
    similarity: number;
  }>;
  conflicts: Array<{
    field: string;
    leftValue: string;
    rightValue: string;
  }>;
  status: 'auto_matched' | 'needs_review' | 'rejected';
}

interface MatchingJob {
  jobId: string;
  sourceA: string;
  sourceB: string;
  strategy: MatchingStrategy;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    stage: number;
    totalStages: number;
    recordsProcessed: number;
    totalRecords: number;
    matchesFound: number;
  };
  results: {
    totalMatches: number;
    autoMatched: number;
    needsReview: number;
    noMatch: number;
    duplicatesFound: number;
  };
}
```

### 4. Survivorship Engine

Determines which values to use in the golden master record.

```typescript
interface SurvivorshipRules {
  defaultStrategy: 'most_recent' | 'most_complete' | 'source_priority';
  sourcePriority: string[];  // e.g., ['salesforce', 'hubspot']
  fieldRules: FieldSurvivorshipRule[];
}

interface FieldSurvivorshipRule {
  fieldName: string;
  strategy: SurvivorshipStrategy;
  parameters?: Record<string, any>;
}

type SurvivorshipStrategy =
  | 'most_recent'           // Latest timestamp wins
  | 'most_complete'         // Non-null over null
  | 'source_priority'       // Preferred source wins
  | 'longest_value'         // Most detailed wins
  | 'aggregate'             // Combine (e.g., tags)
  | 'manual_review';        // Flag for human decision

interface GoldenRecord {
  masterId: string;
  sourceRecords: Array<{
    source: string;
    recordId: string;
    matchConfidence: number;
  }>;
  attributes: Record<string, {
    value: any;
    source: string;
    confidence: number;
    alternatives: Array<{
      value: any;
      source: string;
    }>;
  }>;
  lineage: {
    createdAt: string;
    createdBy: string;
    matchingJobId: string;
    reviewedBy?: string;
  };
}
```

---

## User Interface

### Match Review Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 MASTERING AGENT - Match Review                                            │
│ Job: Salesforce ↔ HubSpot Customer Match                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │    1,247     │ │     892      │ │     287      │ │      68      │       │
│  │ Total Matches│ │ Auto-Matched │ │ Needs Review │ │ No Match     │       │
│  │              │ │   (71.5%)    │ │   (23.0%)    │ │   (5.5%)     │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  Match Quality Distribution                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ High (90-100%)   ████████████████████████████████  642 matches        ││
│  │ Medium (70-89%)  ████████████████                  312 matches        ││
│  │ Low (50-69%)     ████████                          185 matches        ││
│  │ Uncertain (<50%) ████                              108 matches        ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│  📋 NEEDS REVIEW (287 matches)                      [Filter ▼] [Sort ▼]    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│  ┌─ Match #1 ──────────────────────────────────────── Score: 72% ─────────┐│
│  │                                                                         ││
│  │  SALESFORCE                        HUBSPOT                              ││
│  │  ─────────────────────────────     ─────────────────────────────       ││
│  │  Company: Acme Corporation         Company: ACME Corp Inc               ││
│  │  Domain:  (empty)                  Domain:  acme-corp.com              ││
│  │  Phone:   +1-555-123-4567          Phone:   555.123.4567               ││
│  │  City:    New York                 City:    NYC                         ││
│  │  Industry: Technology              Industry: Tech / Software            ││
│  │                                                                         ││
│  │  Matched on: Company name (Jaro-Winkler: 0.89), Phone (normalized)     ││
│  │  Conflicts:  City name format, Industry classification                  ││
│  │                                                                         ││
│  │  [✅ Confirm Match] [❌ Not a Match] [🔍 View Full Records]            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Match #2 ──────────────────────────────────────── Score: 65% ─────────┐│
│  │                                                                         ││
│  │  SALESFORCE                        HUBSPOT                              ││
│  │  ─────────────────────────────     ─────────────────────────────       ││
│  │  Company: Smith & Associates       Company: Smith Associates LLC        ││
│  │  Domain:  smith-assoc.com          Domain:  smithassociates.com        ││
│  │  Phone:   (empty)                  Phone:   +1-555-987-6543            ││
│  │                                                                         ││
│  │  ⚠️ Different domains - possible different companies                   ││
│  │                                                                         ││
│  │  [✅ Confirm Match] [❌ Not a Match] [❓ Unsure - Skip]                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Golden Record View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⭐ GOLDEN MASTER RECORD                                                      │
│ Master ID: MSTR-00001247                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─ Merged Attributes ─────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  Company Name:     Acme Corporation                                      ││
│  │                    └─ Source: Salesforce (preferred) | Alt: "ACME Corp" ││
│  │                                                                          ││
│  │  Domain:           acme-corp.com                                         ││
│  │                    └─ Source: HubSpot (most complete)                   ││
│  │                                                                          ││
│  │  Phone:            +1-555-123-4567                                       ││
│  │                    └─ Source: Salesforce (normalized)                   ││
│  │                                                                          ││
│  │  Address:          123 Business Ave, New York, NY 10001                  ││
│  │                    └─ Source: HubSpot (most recent) | Alt: "NYC"        ││
│  │                                                                          ││
│  │  Industry:         Technology / Software                                 ││
│  │                    └─ Source: HubSpot (more specific)                   ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Source Records ─────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  📊 Salesforce Account                    📊 HubSpot Company            ││
│  │  ID: SF-ACC-000142                        ID: HS-CO-789456              ││
│  │  Match Confidence: 89%                    Match Confidence: 89%         ││
│  │  [View Full Record]                       [View Full Record]            ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Lineage ────────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  Created: 2026-01-27 14:32:15                                           ││
│  │  Job: Salesforce ↔ HubSpot Match (Job ID: MJ-2026-0127-001)            ││
│  │  Strategy: Domain + Fuzzy Name + Phone                                  ││
│  │  Reviewed by: martin@meridianbank.com (Confirmed)                       ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [📝 Edit Record] [🔗 View in Sources] [📥 Export] [🗑️ Unmerge]            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Duplicate Detection View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 DUPLICATE DETECTION - Salesforce Accounts                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Found 127 potential duplicate clusters in 15,342 records                   │
│                                                                              │
│  ┌─ Duplicate Cluster #1 ────────────────────────── 3 records ─────────────┐│
│  │                                                                          ││
│  │  Record 1: Acme Corporation          Owner: John Smith                  ││
│  │            acme@corp.com             Created: 2024-03-15                ││
│  │            +1-555-123-4567           Opportunities: 3 ($450K)           ││
│  │                                                                          ││
│  │  Record 2: ACME Corp                 Owner: Jane Doe                    ││
│  │            info@acme-corp.com        Created: 2025-01-20                ││
│  │            555.123.4567              Opportunities: 1 ($75K)            ││
│  │                                                                          ││
│  │  Record 3: Acme Corp.                Owner: John Smith                  ││
│  │            (no email)                Created: 2025-06-01                ││
│  │            (no phone)                Opportunities: 0                   ││
│  │                                                                          ││
│  │  Similarity Scores:                                                      ││
│  │  • Records 1-2: 87% (Company, Phone match)                              ││
│  │  • Records 1-3: 92% (Company match, same owner)                         ││
│  │  • Records 2-3: 78% (Company match only)                                ││
│  │                                                                          ││
│  │  [🔗 Merge All] [🔗 Merge Selected] [❌ Not Duplicates] [⏭️ Skip]       ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MASTERING WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. USER INPUT                                                              │
│     │                                                                        │
│     │  "Match Salesforce accounts with HubSpot companies"                   │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. SOURCE PROFILING                                                  │   │
│  │    • Connect to both sources                                         │   │
│  │    • Profile columns (fill rate, uniqueness, patterns)               │   │
│  │    • Identify semantic types (company, email, phone)                 │   │
│  │    • Detect data quality issues                                      │   │
│  └────────────────────────────────────┬────────────────────────────────┘   │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. STRATEGY GENERATION (AI)                                          │   │
│  │    • Analyze profiling results                                       │   │
│  │    • Generate matching rules                                         │   │
│  │    • Estimate accuracy and runtime                                   │   │
│  │    • Present to user for approval                                    │   │
│  └────────────────────────────────────┬────────────────────────────────┘   │
│                                       ▼                                     │
│                              [User approves strategy]                       │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. MATCHING EXECUTION                                                │   │
│  │    • Stage 1: Exact matches (domain, ID)                            │   │
│  │    • Stage 2: Fuzzy matches (name, address)                         │   │
│  │    • Stage 3: Probabilistic (multi-attribute)                       │   │
│  │    • Calculate confidence scores                                     │   │
│  └────────────────────────────────────┬────────────────────────────────┘   │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. REVIEW QUEUE                                                      │   │
│  │    • Auto-approve high confidence (>90%)                            │   │
│  │    • Queue medium confidence for review                              │   │
│  │    • Flag low confidence as "no match"                              │   │
│  └────────────────────────────────────┬────────────────────────────────┘   │
│                                       ▼                                     │
│                              [User reviews matches]                         │
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. GOLDEN RECORD CREATION                                            │   │
│  │    • Apply survivorship rules                                        │   │
│  │    • Resolve conflicts                                               │   │
│  │    • Create master records                                           │   │
│  │    • Track full lineage                                              │   │
│  └────────────────────────────────────┬────────────────────────────────┘   │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 7. OUTPUT & INTEGRATION                                              │   │
│  │    • Store in Amygdala catalog                                       │   │
│  │    • Generate quality report                                         │   │
│  │    • Create sync pipeline (optional)                                 │   │
│  │    • Export to downstream systems                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Matching jobs
CREATE TABLE amygdala.mastering_jobs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    source_a TEXT NOT NULL,
    source_b TEXT,  -- NULL for dedup within single source
    strategy JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    progress JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Match pairs
CREATE TABLE amygdala.match_pairs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT REFERENCES amygdala.mastering_jobs(id) ON DELETE CASCADE,
    left_source TEXT NOT NULL,
    left_record_id TEXT NOT NULL,
    right_source TEXT NOT NULL,
    right_record_id TEXT NOT NULL,
    match_score DECIMAL(5,2) NOT NULL,
    confidence TEXT NOT NULL,  -- 'high', 'medium', 'low'
    matched_on JSONB NOT NULL,
    conflicts JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Golden master records
CREATE TABLE amygdala.master_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type TEXT NOT NULL,  -- 'account', 'contact', 'product'
    attributes JSONB NOT NULL,
    source_records JSONB NOT NULL,  -- Array of {source, recordId, confidence}
    survivorship_rules_applied JSONB,
    lineage JSONB NOT NULL,
    trust_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Duplicate clusters
CREATE TABLE amygdala.duplicate_clusters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id TEXT REFERENCES amygdala.mastering_jobs(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    record_ids TEXT[] NOT NULL,
    cluster_size INTEGER NOT NULL,
    similarity_matrix JSONB,
    status TEXT DEFAULT 'pending',  -- 'pending', 'merged', 'not_duplicates'
    master_record_id TEXT REFERENCES amygdala.master_records(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_match_pairs_job ON amygdala.match_pairs(job_id);
CREATE INDEX idx_match_pairs_status ON amygdala.match_pairs(status);
CREATE INDEX idx_duplicate_clusters_job ON amygdala.duplicate_clusters(job_id);
CREATE INDEX idx_master_records_type ON amygdala.master_records(entity_type);
```

---

## Implementation Plan

### Phase 1: Core Engine (Week 1-2)

- [ ] Implement source profiler with semantic type detection
- [ ] Build AI rule generator with Claude integration
- [ ] Create basic matching engine (exact + Levenshtein)
- [ ] Implement confidence scoring

### Phase 2: Advanced Matching (Week 3)

- [ ] Add Jaro-Winkler for name matching
- [ ] Implement token overlap for addresses
- [ ] Add phone number normalization
- [ ] Build probabilistic multi-attribute matching

### Phase 3: Review UI (Week 4)

- [ ] Build match review dashboard
- [ ] Create side-by-side comparison view
- [ ] Implement approve/reject workflow
- [ ] Add bulk actions

### Phase 4: Survivorship & Golden Records (Week 5)

- [ ] Implement survivorship rules engine
- [ ] Build golden record constructor
- [ ] Add lineage tracking
- [ ] Create conflict resolution UI

### Phase 5: Integration & Polish (Week 6)

- [ ] Add chat interface for natural language input
- [ ] Build export functionality
- [ ] Create quality reports
- [ ] Integration with Amygdala catalog

---

## API Endpoints

```typescript
// Start a matching job
POST /api/mastering/jobs
{
  "name": "Salesforce-HubSpot Match",
  "sourceA": "sf_accounts",
  "sourceB": "hs_companies",
  "options": {
    "autoApproveThreshold": 90,
    "enableDedup": true
  }
}

// Get job status
GET /api/mastering/jobs/:jobId

// Get match pairs for review
GET /api/mastering/jobs/:jobId/matches?status=pending&limit=50

// Approve/reject match
POST /api/mastering/matches/:matchId/review
{
  "decision": "approved" | "rejected",
  "notes": "Confirmed via phone call"
}

// Get golden records
GET /api/mastering/records?entityType=account&limit=100

// Unmerge a golden record
POST /api/mastering/records/:recordId/unmerge
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Match accuracy (precision) | > 95% |
| Match recall | > 90% |
| Auto-match rate (no review needed) | > 70% |
| Review time per match | < 30 seconds |
| Rule generation accuracy | > 80% |
| User satisfaction | > 4.5/5 |

---

## References

- [Splink](https://github.com/moj-analytical-services/splink) - Probabilistic record linkage
- [Profisee MDM](https://profisee.com/solutions/initiatives/matching-and-survivorship/) - Enterprise matching
- [Data Matching by Peter Christen](https://link.springer.com/book/10.1007/978-3-642-31164-2) - Academic reference
- [Fuzzy Matching Guide](https://dataladder.com/fuzzy-matching-101/) - Practical guide

---

*This specification defines the Mastering Agent—bringing intelligent data matching to every user, not just MDM specialists.*
