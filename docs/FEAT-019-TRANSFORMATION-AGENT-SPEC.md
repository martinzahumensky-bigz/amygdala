# FEAT-019: Transformation Agent Specification

## Overview

The **Transformation Agent** is the data repair and transformation execution engine for Amygdala. It takes recommendations from other agents (Spotter, Quality, Debugger) and executes actual data fixes with **self-improving iteration**, approval workflows, and full audit trails.

## The Problem

Currently, when agents detect issues:
1. **Spotter** finds anomalies → creates issues → **no automatic fix**
2. **Quality Agent** detects rule failures → logs them → **manual intervention required**
3. **Debugger** identifies root cause → proposes solution → **user must implement manually**

This creates a gap: **detection without remediation**. Users see problems but must write their own SQL/code to fix them.

## The Solution

The Transformation Agent bridges this gap with a **self-improving loop**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-IMPROVING TRANSFORMATION LOOP            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│   │ GENERATE │───▶│ EXECUTE  │───▶│ EVALUATE │                  │
│   │   Code   │    │ (Sandbox)│    │ Results  │                  │
│   └──────────┘    └──────────┘    └────┬─────┘                  │
│        ▲                               │                         │
│        │         ┌──────────┐          │                         │
│        └─────────│  ITERATE │◀─────────┤ Not good enough         │
│                  └──────────┘          │                         │
│                                        │                         │
│                                        ▼ Good enough             │
│                              ┌──────────────────┐                │
│                              │ REQUEST APPROVAL │                │
│                              │  (Human review)  │                │
│                              └────────┬─────────┘                │
│                                       │                          │
│                                       ▼                          │
│                              ┌──────────────────┐                │
│                              │     EXECUTE      │                │
│                              │  (Production)    │                │
│                              └──────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Innovation:** The human is only looped in **once the agent verifies the fix works**.

The full workflow:
1. Taking issue/recommendation context as input
2. Generating fix code (SQL, Python transformations)
3. **Executing on sample data in sandbox (E2B)**
4. **Evaluating results automatically**
5. **Iterating until quality threshold met** (max 5 iterations)
6. Showing preview of verified solution
7. Requesting approval via Operator integration
8. Executing on production data
9. Full audit trail with rollback capability

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Transformation Agent                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Spotter    │    │   Quality    │    │   Debugger   │       │
│  │   Issues     │───▶│   Failures   │───▶│   Solutions  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│          │                  │                    │               │
│          └──────────────────┴────────────────────┘               │
│                             │                                    │
│                             ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Fix Generator   │                          │
│                   │  (Claude AI)     │                          │
│                   └────────┬─────────┘                          │
│                            │                                    │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Preview Engine  │                          │
│                   │  (Dry Run)       │                          │
│                   └────────┬─────────┘                          │
│                            │                                    │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │ Approval Request │◄────── Operator Agent    │
│                   │ (Human-in-loop)  │                          │
│                   └────────┬─────────┘                          │
│                            │                                    │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Executor        │                          │
│                   │  (Apply Changes) │                          │
│                   └────────┬─────────┘                          │
│                            │                                    │
│                            ▼                                    │
│                   ┌──────────────────┐                          │
│                   │  Audit Logger    │                          │
│                   │  (Lineage)       │                          │
│                   └──────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Self-Improving Iteration Loop

The Transformation Agent uses a **self-improving agentic loop** - it generates code, tests it, evaluates results, and iterates until the solution meets quality thresholds. Only then does it request human approval.

### The Core Pattern

```typescript
interface IterationState {
  iteration: number;
  maxIterations: number;          // Default: 5
  code: string;
  results: ExecutionResult;
  evaluation: Evaluation;
  satisfactory: boolean;
  accuracyThreshold: number;      // Default: 95%
}

async runIterativeTransformation(request: TransformationRequest): Promise<TransformationPlan> {
  let state: IterationState = {
    iteration: 0,
    maxIterations: 5,
    accuracyThreshold: 0.95,
    satisfactory: false,
    // ...
  };

  while (state.iteration < state.maxIterations && !state.satisfactory) {
    state.iteration++;

    // 1. GENERATE: Create/improve the transformation code
    state.code = await this.generateTransformationCode({
      request,
      previousCode: state.code,
      previousResults: state.results,
      previousEvaluation: state.evaluation,
    });

    // 2. EXECUTE: Run in sandbox on sample data
    state.results = await this.executeInSandbox(state.code, {
      sampleSize: 1000,
      asset: request.targetAsset,
    });

    // 3. EVALUATE: Check if results meet threshold
    state.evaluation = await this.evaluateResults(state.results, request);
    state.satisfactory = state.evaluation.accuracy >= state.accuracyThreshold;

    // 4. LOG: Record iteration for audit
    await this.logIteration(state);
  }

  // Only request approval if satisfactory
  if (state.satisfactory) {
    return await this.createApprovalRequest(state);
  } else {
    return await this.createFailedPlan(state, 'Could not achieve accuracy threshold');
  }
}
```

### Execution Environment

Based on our [Agent Execution Approaches](./AGENT-EXECUTION-APPROACHES.md), we use:

| Phase | Environment | Why |
|-------|-------------|-----|
| **Iteration (sample)** | E2B Sandbox | Fast, secure, isolated. Perfect for testing on 1k rows. |
| **Production (full)** | Modal or Direct SQL | Scale to millions of rows after approval. |

```typescript
// Sandbox execution for iteration phase
async executeInSandbox(code: string, options: SandboxOptions): Promise<ExecutionResult> {
  const sandbox = await Sandbox.create();

  try {
    // Upload sample data
    const sampleData = await this.getSampleData(options.asset, options.sampleSize);
    await sandbox.filesystem.write('/data/sample.json', JSON.stringify(sampleData));

    // Execute transformation code
    const result = await sandbox.runCode(code, { timeout: 30000 });

    return {
      success: !result.error,
      output: result.results,
      logs: result.logs,
      error: result.error,
      executionTime: result.duration,
    };
  } finally {
    await sandbox.close();
  }
}
```

### Evaluation Logic

The agent evaluates its own results using Claude:

```typescript
async evaluateResults(results: ExecutionResult, request: TransformationRequest): Promise<Evaluation> {
  // Get ground truth sample if available
  const groundTruth = await this.getGroundTruth(request);

  // Ask Claude to evaluate
  const evaluation = await this.analyzeWithClaude(`
    Evaluate this transformation result:

    Task: ${request.description}
    Target: ${request.targetAsset}.${request.targetColumn}

    Sample Results (first 20):
    ${JSON.stringify(results.output.slice(0, 20), null, 2)}

    ${groundTruth ? `Known correct values: ${JSON.stringify(groundTruth)}` : ''}

    Analyze:
    1. What percentage appears correctly transformed?
    2. What edge cases were missed?
    3. What specific improvements would increase accuracy?

    Return JSON: { accuracy: number, issues: string[], improvements: string[] }
  `);

  return {
    accuracy: evaluation.accuracy,
    meetsThreshold: evaluation.accuracy >= this.accuracyThreshold,
    issues: evaluation.issues,
    improvements: evaluation.improvements,
  };
}
```

### Example: Business Email Classification

**User Request:** "Classify emails as business or personal, excluding gmail, yahoo, etc."

#### Iteration 1
```python
# Generated code - first attempt
PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']

def classify_email(email):
    domain = email.split('@')[-1].lower() if email else None
    return 'personal' if domain in PERSONAL_DOMAINS else 'business'
```

**Evaluation:**
```json
{
  "accuracy": 0.85,
  "meetsThreshold": false,
  "issues": [
    "protonmail.com classified as business (should be personal)",
    "icloud.com classified as business (should be personal)",
    "aol.com classified as business (should be personal)"
  ],
  "improvements": [
    "Add privacy-focused email providers (protonmail, tutanota)",
    "Add Apple domains (icloud.com, me.com)",
    "Add legacy providers (aol.com, comcast.net)"
  ]
}
```

#### Iteration 2
```python
# Generated code - improved
PERSONAL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'protonmail.com', 'proton.me', 'tutanota.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'comcast.net', 'verizon.net',
]

def classify_email(email):
    if not email:
        return 'unknown'
    domain = email.split('@')[-1].lower()
    return 'personal' if domain in PERSONAL_DOMAINS else 'business'
```

**Evaluation:**
```json
{
  "accuracy": 0.94,
  "meetsThreshold": false,
  "issues": [
    "ISP domains not covered (att.net, spectrum.net, cox.net)"
  ],
  "improvements": [
    "Add ISP email domains",
    "Consider using a maintained public domain list"
  ]
}
```

#### Iteration 3
```python
# Generated code - final
PERSONAL_DOMAINS = {
    # Major providers
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk',
    'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    # Privacy-focused
    'protonmail.com', 'proton.me', 'tutanota.com', 'pm.me',
    # Apple
    'icloud.com', 'me.com', 'mac.com',
    # Legacy
    'aol.com', 'aim.com',
    # ISPs
    'comcast.net', 'verizon.net', 'att.net', 'spectrum.net',
    'cox.net', 'charter.net', 'sbcglobal.net',
    # International
    'gmx.com', 'gmx.de', 'web.de', 'mail.ru', 'yandex.com',
}

def classify_email(email):
    if not email or '@' not in email:
        return 'unknown'
    domain = email.split('@')[-1].lower()
    return 'personal' if domain in PERSONAL_DOMAINS else 'business'
```

**Evaluation:**
```json
{
  "accuracy": 0.978,
  "meetsThreshold": true,
  "issues": [],
  "improvements": []
}
```

**Result:** After 3 iterations, the agent achieved 97.8% accuracy and is now ready for human approval.

### When to Skip Iteration

Some transformations don't need iteration:

| Transformation Type | Skip Iteration? | Reason |
|--------------------|-----------------|--------|
| Format standardization (regex) | Yes | Deterministic, test once |
| Null fill with constant | Yes | No ambiguity |
| Column rename | Yes | Simple operation |
| Business logic classification | **No** | Needs validation |
| Fuzzy matching | **No** | Threshold tuning required |
| Deduplication | **No** | False positive risk |

```typescript
const SKIP_ITERATION_TYPES = ['null_fill_constant', 'column_rename', 'type_cast'];

if (SKIP_ITERATION_TYPES.includes(request.transformationType)) {
  // Single execution, no iteration
  return await this.executeOnce(request);
}
```

---

## Transformation Types

### 1. Format Standardization
Fix inconsistent data formats detected by Quality Agent.

```typescript
interface FormatTransformation {
  type: 'format_standardization';
  targetAsset: string;
  targetColumn: string;
  fromPattern: string;      // Current messy pattern
  toPattern: string;        // Desired clean pattern
  examples: {
    before: string;
    after: string;
  }[];
}
```

**Examples:**
- Phone: `"1234567890"` → `"+1 (123) 456-7890"`
- Date: `"01/15/2024"` → `"2024-01-15"`
- Email: `"JOHN@EXAMPLE.COM"` → `"john@example.com"`

### 2. Null Remediation
Fix missing values with appropriate defaults or derived values.

```typescript
interface NullRemediation {
  type: 'null_remediation';
  targetAsset: string;
  targetColumn: string;
  strategy: 'default_value' | 'derive_from_other' | 'lookup' | 'ai_infer';
  defaultValue?: any;
  derivationRule?: string;  // e.g., "CONCAT(first_name, ' ', last_name)"
  lookupSource?: {
    table: string;
    joinColumn: string;
    valueColumn: string;
  };
}
```

**Examples:**
- Set `status` to `'unknown'` where NULL
- Derive `full_name` from `first_name` + `last_name`
- Lookup `branch_name` from `ref_branches` using `branch_id`

### 3. Referential Integrity Fixes
Fix broken foreign key references.

```typescript
interface ReferentialFix {
  type: 'referential_fix';
  targetAsset: string;
  targetColumn: string;
  strategy: 'set_null' | 'set_default' | 'map_to_valid' | 'delete_orphans';
  referencedTable: string;
  defaultValue?: any;
  mappingRules?: {
    invalidValue: any;
    validValue: any;
  }[];
}
```

**Examples:**
- Set invalid `branch_id` to `'UNKNOWN'` (a valid placeholder branch)
- Map discontinued product IDs to their replacement IDs
- Delete orphaned transaction records

### 4. Deduplication
Remove or merge duplicate records.

```typescript
interface DeduplicationTransform {
  type: 'deduplication';
  targetAsset: string;
  matchColumns: string[];           // Columns to match on
  survivorshipRules: {
    column: string;
    rule: 'most_recent' | 'most_complete' | 'max' | 'min' | 'first' | 'concatenate';
  }[];
  action: 'delete_duplicates' | 'merge_into_master' | 'flag_only';
}
```

### 5. Outlier Correction
Fix statistical outliers detected by Spotter.

```typescript
interface OutlierCorrection {
  type: 'outlier_correction';
  targetAsset: string;
  targetColumn: string;
  strategy: 'cap_at_percentile' | 'set_to_mean' | 'set_to_median' | 'flag_for_review' | 'delete';
  percentile?: number;  // e.g., 99 for capping at 99th percentile
}
```

### 6. Custom SQL Transformation
For complex fixes that don't fit predefined patterns.

```typescript
interface CustomTransformation {
  type: 'custom_sql';
  targetAsset: string;
  description: string;
  sqlStatement: string;
  rollbackStatement?: string;
  affectedColumns: string[];
}
```

---

## Workflow

### Step 1: Receive Transformation Request

The agent can be triggered by:
1. **Direct invocation** from UI ("Fix this issue")
2. **Issue context** with suggested fix from Debugger
3. **Quality rule failure** with auto-generated fix
4. **Chat command** via Orchestrator ("Fix the phone numbers in silver_customers")

```typescript
interface TransformationRequest {
  sourceType: 'issue' | 'quality_rule' | 'manual' | 'chat';
  sourceId?: string;        // Issue ID or rule ID
  targetAsset: string;
  transformationType: TransformationType;
  parameters: Record<string, any>;
  requestedBy: string;      // User or agent name
  priority: 'low' | 'medium' | 'high' | 'critical';
}
```

### Step 2: Generate Fix Code

Claude AI analyzes the request and generates appropriate fix:

```typescript
async generateFix(request: TransformationRequest): Promise<TransformationPlan> {
  const prompt = `You are a data transformation expert. Generate a fix for:

  Asset: ${request.targetAsset}
  Problem: ${request.description}
  Transformation Type: ${request.transformationType}

  Requirements:
  1. Generate safe, reversible SQL
  2. Include a WHERE clause to limit scope
  3. Provide a rollback statement
  4. Estimate affected row count

  Return JSON with: sqlStatement, rollbackStatement, affectedColumns, estimatedRows`;

  return await this.analyzeWithClaude(prompt, request);
}
```

### Step 3: Preview Changes (Dry Run)

Before executing, show the user what will change:

```typescript
interface TransformationPreview {
  plan: TransformationPlan;
  affectedRowCount: number;
  sampleBefore: Record<string, any>[];  // 10 sample rows before
  sampleAfter: Record<string, any>[];   // Same rows after (simulated)
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  estimatedDuration: string;
  reversible: boolean;
}
```

**UI Preview Component:**
```
┌─────────────────────────────────────────────────────────────┐
│  Transformation Preview                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Target: silver_customers.phone                              │
│  Type: Format Standardization                                │
│  Affected Rows: 847 of 5,000 (16.9%)                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Before                    │ After                       ││
│  ├───────────────────────────┼─────────────────────────────┤│
│  │ 1234567890                │ +1 (123) 456-7890          ││
│  │ 555.123.4567              │ +1 (555) 123-4567          ││
│  │ (800) 555-1234            │ +1 (800) 555-1234          ││
│  │ 1-800-FLOWERS             │ +1 (800) 356-9377          ││
│  └───────────────────────────┴─────────────────────────────┘│
│                                                              │
│  Risk Assessment: LOW                                        │
│  ✓ Transformation is reversible                             │
│  ✓ No cascading effects on other tables                     │
│  ✓ Format change only, no data loss                         │
│                                                              │
│  [Cancel]                    [Request Approval]              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Request Approval

For non-trivial transformations, require human approval:

```typescript
interface ApprovalRequest {
  transformationId: string;
  plan: TransformationPlan;
  preview: TransformationPreview;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;        // Auto-expire after 24h
  approvalLevel: 'user' | 'admin' | 'auto';  // Based on risk
}

// Auto-approve rules (configurable):
const AUTO_APPROVE_RULES = {
  maxAffectedRows: 100,           // Auto-approve if < 100 rows
  allowedTypes: ['format_standardization', 'null_remediation'],
  riskLevel: 'low',
  requiresRollback: true,
};
```

**Approval Flow:**
1. Create approval request
2. Notify via UI (toast/notification)
3. User reviews preview
4. User approves/rejects with optional comment
5. If rejected, provide feedback for refinement

### Step 5: Execute Transformation

```typescript
async executeTransformation(
  plan: TransformationPlan,
  approval: ApprovalRecord
): Promise<TransformationResult> {
  const startTime = Date.now();

  try {
    // 1. Create backup snapshot
    const snapshotId = await this.createSnapshot(plan.targetAsset, plan.affectedRows);

    // 2. Begin transaction
    await this.beginTransaction();

    // 3. Execute the transformation
    const result = await this.executeSql(plan.sqlStatement);

    // 4. Validate results
    const validation = await this.validateResults(plan, result);
    if (!validation.passed) {
      await this.rollback();
      throw new Error(`Validation failed: ${validation.reason}`);
    }

    // 5. Commit transaction
    await this.commit();

    // 6. Log to audit trail
    await this.logTransformation({
      planId: plan.id,
      approvalId: approval.id,
      snapshotId,
      rowsAffected: result.rowCount,
      duration: Date.now() - startTime,
      status: 'success',
    });

    // 7. Update related issue status
    if (plan.sourceIssueId) {
      await this.updateIssueStatus(plan.sourceIssueId, 'resolved');
    }

    return { success: true, rowsAffected: result.rowCount, snapshotId };

  } catch (error) {
    await this.rollback();
    await this.logTransformation({ ...plan, status: 'failed', error: error.message });
    throw error;
  }
}
```

### Step 6: Audit & Lineage

Every transformation is fully tracked:

```typescript
interface TransformationLog {
  id: string;
  transformationPlan: TransformationPlan;
  executedAt: string;
  executedBy: string;
  approvedBy: string;
  snapshotId: string;           // For rollback
  rowsAffected: number;
  duration: number;
  status: 'success' | 'failed' | 'rolled_back';
  lineage: {
    sourceAssets: string[];
    targetAsset: string;
    columnsModified: string[];
    transformationType: string;
  };
}
```

---

## Database Schema

```sql
-- Transformation plans (pending execution)
CREATE TABLE amygdala.transformation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,              -- 'issue', 'quality_rule', 'manual', 'chat'
  source_id UUID,                         -- Reference to issue or rule
  target_asset TEXT NOT NULL,
  transformation_type TEXT NOT NULL,
  parameters JSONB NOT NULL,
  sql_statement TEXT NOT NULL,
  rollback_statement TEXT,
  affected_columns TEXT[],
  estimated_rows INTEGER,
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'rejected', 'executed', 'failed'
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformation approvals
CREATE TABLE amygdala.transformation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES amygdala.transformation_plans(id),
  status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  comment TEXT,
  auto_approved BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformation execution logs
CREATE TABLE amygdala.transformation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES amygdala.transformation_plans(id),
  approval_id UUID REFERENCES amygdala.transformation_approvals(id),
  snapshot_id UUID,                       -- Reference to pre-transformation snapshot
  rows_affected INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL,                   -- 'success', 'failed', 'rolled_back'
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by TEXT NOT NULL
);

-- Pre-transformation snapshots (for rollback)
CREATE TABLE amygdala.transformation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES amygdala.transformation_plans(id),
  target_asset TEXT NOT NULL,
  affected_row_ids TEXT[],                -- IDs of affected rows
  snapshot_data JSONB NOT NULL,           -- Full row data before change
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ                  -- Auto-cleanup old snapshots
);
```

---

## API Endpoints

### Create Transformation Plan
```
POST /api/agents/transformation/plan
{
  "sourceType": "issue",
  "sourceId": "uuid",
  "targetAsset": "silver_customers",
  "transformationType": "format_standardization",
  "parameters": {
    "targetColumn": "phone",
    "toPattern": "+1 (XXX) XXX-XXXX"
  }
}
```

### Get Preview
```
GET /api/agents/transformation/preview/:planId
Response: TransformationPreview
```

### Request Approval
```
POST /api/agents/transformation/approve/:planId
{
  "action": "approve" | "reject",
  "comment": "Looks good, proceed"
}
```

### Execute Transformation
```
POST /api/agents/transformation/execute/:planId
Response: TransformationResult
```

### Rollback Transformation
```
POST /api/agents/transformation/rollback/:logId
Response: RollbackResult
```

### Get Transformation History
```
GET /api/agents/transformation/history?asset=silver_customers
Response: TransformationLog[]
```

---

## UI Integration

### 1. Issue Detail Page
Add "Apply Fix" button when Debugger has proposed a solution:

```tsx
{issue.metadata?.proposedFix && (
  <Button onClick={() => createTransformationPlan(issue)}>
    <Wrench className="w-4 h-4 mr-2" />
    Apply Suggested Fix
  </Button>
)}
```

### 2. Quality Rules Tab
Add "Auto-Fix" option for failed rules:

```tsx
{rule.failedCount > 0 && rule.autoFixable && (
  <Button variant="outline" onClick={() => createFixForRule(rule)}>
    Fix {rule.failedCount} records
  </Button>
)}
```

### 3. Asset Transformations Tab
Show transformation history and pending plans:

```tsx
<Tabs>
  <Tab label="Pending">
    <PendingTransformations assetId={asset.id} />
  </Tab>
  <Tab label="History">
    <TransformationHistory assetId={asset.id} />
  </Tab>
</Tabs>
```

### 4. Approval Queue (New Page)
Dashboard for reviewing pending transformations:

```
/dashboard/transformations
├── Pending Approval (3)
├── Recently Executed (10)
└── Failed/Rolled Back (2)
```

---

## Safety Features

### 1. Row Limit Guards
```typescript
const MAX_ROWS_PER_TRANSFORMATION = 10000;

if (plan.estimatedRows > MAX_ROWS_PER_TRANSFORMATION) {
  throw new Error(`Transformation affects too many rows (${plan.estimatedRows}). Split into smaller batches.`);
}
```

### 2. Required Rollback
```typescript
if (!plan.rollbackStatement && plan.riskLevel !== 'low') {
  throw new Error('Rollback statement required for medium/high risk transformations');
}
```

### 3. Approval Expiration
```typescript
// Auto-expire unapproved plans after 24 hours
const APPROVAL_EXPIRY_HOURS = 24;
```

### 4. Restricted Operations
```typescript
const BLOCKED_OPERATIONS = [
  'DROP TABLE',
  'TRUNCATE',
  'DELETE FROM .* WHERE 1=1',  // Delete all
  'ALTER TABLE',
];
```

### 5. Audit Everything
- Every transformation logged
- Before/after snapshots
- User attribution
- Timestamp tracking

---

## Integration with Other Agents

### Spotter → Transformation
When Spotter finds an issue, it can suggest a transformation type:

```typescript
// In Spotter agent
if (anomaly.type === 'invalid_format') {
  issue.metadata.suggestedTransformation = {
    type: 'format_standardization',
    targetColumn: anomaly.column,
    currentPattern: anomaly.detectedPattern,
  };
}
```

### Quality Agent → Transformation
Quality rule failures can auto-generate fix plans:

```typescript
// In Quality agent
if (rule.autoFixable && result.passRate < rule.threshold) {
  await createTransformationPlan({
    sourceType: 'quality_rule',
    sourceId: rule.id,
    transformationType: rule.fixType,
    parameters: rule.fixParameters,
  });
}
```

### Debugger → Transformation
Debugger's solution proposals feed directly into transformation:

```typescript
// In Debugger agent
analysis.proposedFix = {
  description: 'Standardize phone numbers to E.164 format',
  transformationType: 'format_standardization',
  sql: `UPDATE silver_customers SET phone = format_phone(phone) WHERE phone !~ '^\\+1'`,
  confidence: 0.92,
};
```

### Operator → Transformation
Operator can execute approved transformations:

```typescript
// In Operator agent
case 'execute_transformation':
  const plan = await getTransformationPlan(params.planId);
  const approval = await getApproval(plan.id);
  if (approval.status === 'approved') {
    return await transformationAgent.execute(plan, approval);
  }
```

---

## Example Scenarios

### Scenario 1: Fix Invalid Phone Numbers

**Trigger:** Quality rule `silver_customers.phone format` fails with 15% invalid

**Flow:**
1. Quality Agent creates issue with `autoFixable: true`
2. User clicks "Apply Fix" on issue page
3. Transformation Agent generates:
   ```sql
   UPDATE meridian.silver_customers
   SET phone = regexp_replace(
     regexp_replace(phone, '[^0-9]', '', 'g'),
     '^1?([0-9]{3})([0-9]{3})([0-9]{4})$',
     '+1 (\1) \2-\3'
   )
   WHERE phone !~ '^\+1 \([0-9]{3}\) [0-9]{3}-[0-9]{4}$'
   ```
4. Preview shows 847 rows will change
5. User approves
6. Transformation executes
7. Quality rule now passes

### Scenario 2: Fix Orphaned Branch References

**Trigger:** Spotter detects `branch_id` values not in `ref_branches`

**Flow:**
1. Spotter creates issue: "42 transactions reference invalid branches"
2. Debugger analyzes: "Branch 'OLD_BRANCH_001' was renamed to 'BRANCH_101'"
3. Debugger proposes fix:
   ```sql
   UPDATE meridian.silver_transactions
   SET branch_id = 'BRANCH_101'
   WHERE branch_id = 'OLD_BRANCH_001'
   ```
4. User approves
5. Transformation executes
6. Issue auto-resolved

### Scenario 3: Bulk Email Standardization

**Trigger:** Chat command: "Standardize all email addresses to lowercase"

**Flow:**
1. Orchestrator routes to Transformation Agent
2. Agent generates plan for `silver_customers.email`
3. Preview: 2,341 rows affected
4. Risk: LOW (format only, reversible)
5. Auto-approved (meets auto-approve criteria)
6. Executes in background
7. Chat response: "Standardized 2,341 email addresses to lowercase"

---

## Configuration

```typescript
// lib/agents/transformation-config.ts
export const TRANSFORMATION_CONFIG = {
  // Auto-approval settings
  autoApprove: {
    enabled: true,
    maxRows: 100,
    allowedTypes: ['format_standardization', 'null_remediation'],
    maxRiskLevel: 'low',
    requireRollback: true,
  },

  // Execution limits
  limits: {
    maxRowsPerTransformation: 10000,
    maxConcurrentTransformations: 3,
    snapshotRetentionDays: 30,
    approvalExpiryHours: 24,
  },

  // Blocked patterns (security)
  blockedPatterns: [
    /DROP\s+TABLE/i,
    /TRUNCATE/i,
    /DELETE\s+FROM\s+\w+\s*$/i,  // DELETE without WHERE
    /ALTER\s+TABLE/i,
    /GRANT/i,
    /REVOKE/i,
  ],
};
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Issue resolution via transformation | 40% of fixable issues |
| Average time from detection to fix | < 1 hour |
| Transformation success rate | > 95% |
| Rollback rate | < 5% |
| Auto-approved transformations | 30% of low-risk fixes |

---

## Implementation Plan

### Phase 1: Core Framework + Iteration Loop (Week 1)
- [ ] Create `TransformationAgent` class extending `BaseAgent`
- [ ] Implement database schema (plans, approvals, logs, snapshots, iterations)
- [ ] Build basic plan generation with Claude
- [ ] **Implement self-improving iteration loop**
- [ ] **Integrate E2B sandbox for code execution**
- [ ] Create evaluation logic (accuracy scoring)

### Phase 2: Execution Engine (Week 1)
- [ ] Transaction management
- [ ] Snapshot creation (before/after)
- [ ] SQL execution with validation
- [ ] Rollback functionality
- [ ] **Preview engine with sample results**

### Phase 3: Approval Workflow (Week 2)
- [ ] Approval request creation
- [ ] UI for approval queue (showing iteration history)
- [ ] Auto-approve rules engine
- [ ] Notification integration

### Phase 4: UI Integration (Week 2)
- [ ] Issue page "Apply Fix" button
- [ ] Quality rules "Auto-Fix" option
- [ ] Transformations tab in catalog
- [ ] Approval queue dashboard
- [ ] **Iteration log viewer (show agent's "thinking")**

### Phase 5: Agent Integration (Week 2)
- [ ] Spotter → suggested transformations
- [ ] Quality Agent → auto-fixable rules
- [ ] Debugger → proposed fixes
- [ ] Orchestrator → chat commands ("fix the phone numbers")

### Phase 6: Scale (Week 3 - Optional)
- [ ] Integrate Modal for large dataset execution (>10k rows)
- [ ] Parallel transformation support
- [ ] Scheduled/batch transformations

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Iteration Control | LangGraph (or custom state machine) | Manage generate→execute→evaluate loop |
| Sandbox Execution | E2B | Isolated code execution during iteration |
| Production Execution | Direct SQL / Modal | Execute approved transformations at scale |
| Code Generation | Claude API | Generate and improve transformation code |
| Evaluation | Claude API | Assess accuracy and suggest improvements |

---

## Files to Create

```
apps/platform/
├── lib/agents/
│   └── transformation.ts           # Main agent class
├── app/api/agents/transformation/
│   ├── plan/route.ts               # Create plan
│   ├── preview/[planId]/route.ts   # Get preview
│   ├── approve/[planId]/route.ts   # Approval actions
│   ├── execute/[planId]/route.ts   # Execute transformation
│   ├── rollback/[logId]/route.ts   # Rollback
│   └── history/route.ts            # Get history
├── app/dashboard/transformations/
│   └── page.tsx                    # Approval queue
└── components/transformations/
    ├── TransformationPreview.tsx
    ├── ApprovalQueue.tsx
    └── TransformationHistory.tsx
```

---

## Open Questions

1. **Batch size for large transformations?** Split 50k rows into 5k batches?
2. **Scheduling?** Allow scheduled transformations (e.g., "run at midnight")?
3. **Dry-run mode for production?** Preview in prod without executing?
4. **Multi-asset transformations?** Support joins across tables?
5. **Transformation templates?** Pre-built fixes for common issues?
6. **Ground truth data?** How to get labeled data for accuracy evaluation?
7. **User feedback loop?** Can users mark false positives to improve future runs?

---

## Related Documentation

- [Self-Improving Agents: Business Perspective](./SELF-IMPROVING-AGENTS-BUSINESS.md) - Business value, risks, and use cases
- [Agent Execution Approaches](./AGENT-EXECUTION-APPROACHES.md) - Technical comparison of E2B, Modal, LangGraph
- [Data Mastering Agent Spec](./FEAT-015-MASTERING-AGENT-SPEC.md) - Related agent for data matching/merging
