# FEAT-023: Automation Agent Specification

## Overview

The **Automation Agent** enables users to create custom, rule-based workflows that execute automatically based on triggers or schedules. Inspired by [Atlan Playbooks](https://docs.atlan.com/product/capabilities/governance/stewardship/how-tos/automate-data-governance), [Airtable Automations](https://support.airtable.com/docs/getting-started-with-airtable-automations), and [n8n workflows](https://docs.n8n.io/), this feature transforms Amygdala from a reactive platform into a proactive automation engine.

## The Problem

Currently, data stewardship in Amygdala is **reactive**:
1. **Manual monitoring** - Users must manually check for issues, missing owners, stale data
2. **No proactive enforcement** - Governance policies exist but aren't auto-enforced
3. **Repetitive tasks** - Data stewards perform the same checks daily
4. **Delayed responses** - Issues aren't caught until someone looks

**Example pain points:**
- "Every day I manually check for catalog items without owners"
- "When a new issue is created, I have to manually assign it based on asset type"
- "I want to auto-archive assets that haven't been accessed in 90 days"

## The Solution

The Automation Agent provides a **trigger → condition → action** framework:

```
┌─────────────────────────────────────────────────────────────────┐
│                       AUTOMATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐    ┌──────────────┐    ┌──────────────┐         │
│   │ TRIGGER  │───▶│  CONDITIONS  │───▶│   ACTIONS    │         │
│   │          │    │  (Optional)  │    │              │         │
│   └──────────┘    └──────────────┘    └──────────────┘         │
│                                                                  │
│   When...          If...              Then...                   │
│   - Schedule       - Field matches    - Update metadata         │
│   - Record created - Contains value   - Create issue            │
│   - Record updated - Trust score <    - Assign owner            │
│   - Issue created  - Asset type is    - Send notification       │
│   - Issue resolved - Age > X days     - Run agent               │
│   - Agent completes                   - Execute webhook         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Research Summary

### Atlan Playbooks
- **Event-driven**: Trigger on metadata changes, schema updates
- **Rule-based**: Auto-tag PII, propagate classifications, enforce policies
- **Bulk operations**: Update metadata across thousands of assets at once
- **Governance workflows**: Change management, access approval, policy enforcement
- **Key insight**: Focus on metadata automation and compliance enforcement

### Airtable Automations
- **8 trigger types**: Record created/updated, scheduled, webhook, button click, form submission, record enters view, record matches conditions
- **Dynamic tokens**: Pass data between steps (e.g., `{{record.name}}`)
- **Conditional logic**: Filter which records trigger actions
- **AI integration**: "Generate with AI" action for intelligent processing
- **Key insight**: Simple but powerful trigger-action model with good UX

### n8n Workflows
- **Node-based**: Modular components (triggers, actions, logic, transform)
- **Branching**: IF/Switch nodes for conditional flows
- **Sub-workflows**: Reusable workflow components
- **Error handling**: Dedicated error flows and retry logic
- **Key insight**: Complex workflows with visual builder

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     Automation Agent System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Workflow Engine │  │  Trigger Manager │                    │
│  │  (Executor)      │  │  (Listener)      │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
│           │                     │                               │
│           └──────────┬──────────┘                               │
│                      │                                          │
│           ┌──────────▼──────────┐                               │
│           │   Workflow Store    │                               │
│           │   (Definitions)     │                               │
│           └──────────┬──────────┘                               │
│                      │                                          │
│  ┌───────────────────┼───────────────────┐                     │
│  │                   │                   │                      │
│  ▼                   ▼                   ▼                      │
│ ┌─────────┐    ┌──────────┐    ┌──────────────┐               │
│ │ Actions │    │Conditions│    │ Integrations │               │
│ │ Library │    │ Evaluator│    │ (Webhooks)   │               │
│ └─────────┘    └──────────┘    └──────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow Definition

```typescript
interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;

  trigger: Trigger;
  conditions?: Condition[];
  actions: Action[];

  settings: {
    runLimit?: number;         // Max runs per day
    cooldownMinutes?: number;  // Min time between runs
    errorHandling: 'stop' | 'continue' | 'notify';
  };

  createdBy: string;
  createdAt: string;
  lastRunAt?: string;
  runCount: number;
}
```

---

## Trigger Types

### 1. Scheduled Trigger
Run automation at specified intervals.

```typescript
interface ScheduledTrigger {
  type: 'scheduled';
  interval: {
    type: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'cron';
    value: number | string;  // Number for simple intervals, cron string for cron
    at?: string;             // Time of day (HH:mm) for daily/weekly/monthly
    daysOfWeek?: number[];   // 0-6 for weekly (0=Sunday)
    dayOfMonth?: number;     // 1-31 for monthly
  };
}
```

**Examples:**
- Every 15 minutes
- Daily at 9:00 AM
- Weekly on Monday and Friday at 10:00 AM
- First day of month at midnight
- Custom cron: `0 9 * * 1-5` (weekdays at 9am)

### 2. Record Created Trigger
Fire when a new record is created in the catalog.

```typescript
interface RecordCreatedTrigger {
  type: 'record_created';
  entityType: 'asset' | 'issue' | 'data_product' | 'quality_rule';
  filter?: {
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'in';
    value: any;
  };
}
```

**Examples:**
- When any new asset is created
- When a new issue with severity "critical" is created
- When a new data product in domain "Finance" is created

### 3. Record Updated Trigger
Fire when a record field changes.

```typescript
interface RecordUpdatedTrigger {
  type: 'record_updated';
  entityType: 'asset' | 'issue' | 'data_product' | 'quality_rule';
  watchFields?: string[];  // Specific fields to watch, or all if empty
  filter?: {
    field: string;
    operator: string;
    value: any;
  };
}
```

**Examples:**
- When asset owner changes
- When issue status changes to "resolved"
- When trust score drops below 50

### 4. Record Matches Condition Trigger
Fire when a record enters a state matching conditions.

```typescript
interface RecordMatchesTrigger {
  type: 'record_matches';
  entityType: 'asset' | 'issue' | 'data_product';
  conditions: Condition[];
  checkInterval?: number;  // Minutes between checks (default: 60)
}
```

**Examples:**
- Assets where owner is NULL
- Issues older than 7 days and still open
- Assets with trust score < 30

### 5. Agent Completed Trigger
Fire when an agent run completes.

```typescript
interface AgentCompletedTrigger {
  type: 'agent_completed';
  agentName?: string;  // Specific agent, or any if empty
  status?: 'success' | 'failed' | 'any';
  resultFilter?: {
    field: string;
    operator: string;
    value: any;
  };
}
```

**Examples:**
- When Spotter agent completes and finds > 0 anomalies
- When any agent fails
- When Quality agent completes with < 80% pass rate

### 6. Webhook Trigger
Fire on external webhook call.

```typescript
interface WebhookTrigger {
  type: 'webhook';
  webhookId: string;  // Auto-generated unique ID for the URL
  secret?: string;    // Optional validation secret
  payloadSchema?: JsonSchema;  // Expected payload structure
}
```

**URL Pattern:** `POST /api/automations/webhook/:webhookId`

### 7. Manual Trigger (Button)
Fire when user clicks a button in the UI.

```typescript
interface ManualTrigger {
  type: 'manual';
  buttonLabel: string;
  showOn: ('asset_detail' | 'issue_detail' | 'automation_list')[];
  requireConfirmation?: boolean;
}
```

---

## Conditions

Conditions filter when actions should execute. Multiple conditions use AND logic by default.

```typescript
interface Condition {
  field: string;           // Field path (supports dot notation: "metadata.owner")
  operator: ConditionOperator;
  value: any;
  logic?: 'and' | 'or';    // Logic with previous condition
}

type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches'        // Regex
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'             // Value in array
  | 'not_in';
```

**Example conditions:**
```typescript
// Assets without owner
{ field: 'owner', operator: 'is_empty' }

// Critical issues in Finance domain
{ field: 'severity', operator: 'equals', value: 'critical' },
{ field: 'asset.domain', operator: 'equals', value: 'Finance' }

// Assets with trust score between 30-50
{ field: 'trust_score', operator: 'greater_than', value: 30 },
{ field: 'trust_score', operator: 'less_than', value: 50 }
```

---

## Actions

### 1. Update Record
Modify fields on the triggering record or related records.

```typescript
interface UpdateRecordAction {
  type: 'update_record';
  target: 'trigger_record' | 'related_record';
  relatedRecordQuery?: {
    entityType: string;
    filter: Condition[];
  };
  updates: {
    field: string;
    value: any | '{{token}}';  // Static value or token reference
  }[];
}
```

**Examples:**
- Set owner to "data-team@company.com" for unowned assets
- Update issue status to "investigating"
- Set classification to "PII" for assets containing SSN

### 2. Create Record
Create a new record (typically an issue).

```typescript
interface CreateRecordAction {
  type: 'create_record';
  entityType: 'issue' | 'data_product';
  data: Record<string, any | '{{token}}'>;
}
```

**Example:**
```typescript
// Create issue for unowned asset
{
  type: 'create_record',
  entityType: 'issue',
  data: {
    title: 'Asset {{record.name}} has no owner',
    description: 'This asset was detected without an owner. Please assign ownership.',
    severity: 'medium',
    asset_id: '{{record.id}}',
    type: 'governance'
  }
}
```

### 3. Send Notification
Send email, Slack, or webhook notification.

```typescript
interface SendNotificationAction {
  type: 'send_notification';
  channel: 'email' | 'slack' | 'webhook';
  recipients?: string[];        // For email
  slackChannel?: string;        // For Slack
  webhookUrl?: string;          // For webhook
  template: {
    subject?: string;           // For email
    body: string;               // Supports tokens
  };
}
```

**Example:**
```typescript
{
  type: 'send_notification',
  channel: 'slack',
  slackChannel: '#data-quality-alerts',
  template: {
    body: 'Critical issue detected: {{record.title}}\nAsset: {{record.asset.name}}\nSeverity: {{record.severity}}'
  }
}
```

### 4. Run Agent
Trigger another Amygdala agent.

```typescript
interface RunAgentAction {
  type: 'run_agent';
  agentName: 'spotter' | 'debugger' | 'quality' | 'documentarist' | 'trust' | 'transformation';
  context?: {
    assetId?: string | '{{record.id}}';
    issueId?: string | '{{record.id}}';
    parameters?: Record<string, any>;
  };
  waitForCompletion?: boolean;
}
```

**Example:**
```typescript
// Run Debugger when critical issue created
{
  type: 'run_agent',
  agentName: 'debugger',
  context: {
    issueId: '{{record.id}}'
  },
  waitForCompletion: false
}
```

### 5. Execute Webhook
Call external API.

```typescript
interface ExecuteWebhookAction {
  type: 'execute_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, any | '{{token}}'>;
  retryOnFailure?: boolean;
  retryCount?: number;
}
```

### 6. Generate with AI
Use Claude to generate content or make decisions.

```typescript
interface GenerateWithAIAction {
  type: 'generate_with_ai';
  prompt: string;  // Supports tokens
  outputField: string;  // Where to store result
  outputType: 'text' | 'json' | 'classification';
  options?: {
    choices?: string[];  // For classification
    maxTokens?: number;
  };
}
```

**Example:**
```typescript
// Auto-classify issue type based on description
{
  type: 'generate_with_ai',
  prompt: 'Classify this data quality issue into one of: missing_data, invalid_format, outlier, referential_integrity, stale_data. Issue: {{record.description}}',
  outputField: 'issue_type',
  outputType: 'classification',
  options: {
    choices: ['missing_data', 'invalid_format', 'outlier', 'referential_integrity', 'stale_data']
  }
}
```

### 7. Delay
Pause execution for specified time.

```typescript
interface DelayAction {
  type: 'delay';
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
}
```

### 8. Conditional Branch
Execute different actions based on conditions.

```typescript
interface ConditionalBranchAction {
  type: 'conditional_branch';
  conditions: Condition[];
  ifTrue: Action[];
  ifFalse?: Action[];
}
```

---

## Token System

Tokens allow dynamic values in actions using `{{path}}` syntax.

### Available Tokens

| Token | Description | Example Value |
|-------|-------------|---------------|
| `{{record.id}}` | Triggering record ID | `"abc-123"` |
| `{{record.name}}` | Record name | `"silver_customers"` |
| `{{record.owner}}` | Record owner | `"john@company.com"` |
| `{{record.metadata.X}}` | Any metadata field | varies |
| `{{trigger.type}}` | Trigger type | `"scheduled"` |
| `{{trigger.timestamp}}` | When triggered | `"2026-01-30T10:00:00Z"` |
| `{{automation.name}}` | Automation name | `"Unowned Asset Check"` |
| `{{previous_action.result}}` | Previous action output | varies |
| `{{env.VAR}}` | Environment variable | varies |

### Token Transformation Functions

```typescript
// String functions
{{record.name | uppercase}}       // "SILVER_CUSTOMERS"
{{record.name | lowercase}}       // "silver_customers"
{{record.name | truncate:20}}     // "silver_customer..."

// Date functions
{{trigger.timestamp | date:'YYYY-MM-DD'}}  // "2026-01-30"
{{trigger.timestamp | relative}}            // "2 hours ago"

// Conditional
{{record.owner | default:'unassigned'}}    // Use default if null
```

---

## Database Schema

```sql
-- Automation definitions
CREATE TABLE amygdala.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  trigger JSONB NOT NULL,           -- Trigger configuration
  conditions JSONB DEFAULT '[]',    -- Array of conditions
  actions JSONB NOT NULL,           -- Array of actions

  settings JSONB DEFAULT '{
    "errorHandling": "notify",
    "runLimit": null,
    "cooldownMinutes": null
  }',

  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0
);

-- Automation run logs
CREATE TABLE amygdala.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES amygdala.automations(id) ON DELETE CASCADE,

  trigger_type TEXT NOT NULL,
  trigger_data JSONB,               -- Data that triggered the run

  status TEXT NOT NULL,             -- 'running', 'success', 'failed', 'skipped'

  actions_executed JSONB DEFAULT '[]',  -- Log of each action
  error_message TEXT,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Scheduled trigger tracking
CREATE TABLE amygdala.automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES amygdala.automations(id) ON DELETE CASCADE,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  UNIQUE(automation_id)
);

-- Webhook endpoints
CREATE TABLE amygdala.automation_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES amygdala.automations(id) ON DELETE CASCADE,
  webhook_id TEXT NOT NULL UNIQUE,  -- Public identifier for URL
  secret TEXT,                       -- Optional validation secret
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_called_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_automations_enabled ON amygdala.automations(enabled);
CREATE INDEX idx_automation_runs_automation ON amygdala.automation_runs(automation_id);
CREATE INDEX idx_automation_runs_status ON amygdala.automation_runs(status);
CREATE INDEX idx_automation_schedules_next ON amygdala.automation_schedules(next_run_at);
```

---

## API Endpoints

### Automation CRUD

```
GET    /api/automations              # List all automations
POST   /api/automations              # Create automation
GET    /api/automations/:id          # Get automation
PUT    /api/automations/:id          # Update automation
DELETE /api/automations/:id          # Delete automation
POST   /api/automations/:id/toggle   # Enable/disable
POST   /api/automations/:id/run      # Manual trigger
```

### Automation Runs

```
GET    /api/automations/:id/runs     # Get run history
GET    /api/automation-runs/:runId   # Get run details
```

### Webhooks

```
POST   /api/automations/webhook/:webhookId  # Webhook trigger endpoint
```

---

## UI Components

### 1. Automations List Page (`/dashboard/automations`)

```
┌─────────────────────────────────────────────────────────────────┐
│  Automations                                    [+ New Automation] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🟢 Unowned Asset Check                        [Edit] [Toggle] │ │
│  │ Scheduled: Daily at 9:00 AM                                   │ │
│  │ Last run: 2 hours ago • 12 runs this week                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 🟢 Critical Issue Auto-Assign                  [Edit] [Toggle] │ │
│  │ Trigger: When issue created (severity = critical)            │ │
│  │ Last run: 5 minutes ago • 3 runs today                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ⚪ Stale Data Archiver                         [Edit] [Toggle] │ │
│  │ Scheduled: Monthly on 1st at midnight                        │ │
│  │ Disabled • Last run: 30 days ago                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Automation Builder Modal

Visual builder with three sections: Trigger, Conditions, Actions

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Automation                                        [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Name: [_Unowned Asset Check_________________________]           │
│                                                                   │
│  ── TRIGGER ─────────────────────────────────────────────────   │
│  [Scheduled ▼]                                                   │
│  Every [1] [Days ▼] at [09:00 ▼]                                │
│                                                                   │
│  ── CONDITIONS (optional) ────────────────────────────────────   │
│  When matching records exist:                                    │
│  Entity: [Assets ▼]                                              │
│  Where: [owner ▼] [is empty ▼]                                  │
│  [+ Add condition]                                               │
│                                                                   │
│  ── ACTIONS ─────────────────────────────────────────────────   │
│  1. [Create Record ▼]                                           │
│     Type: Issue                                                  │
│     Title: Asset {{record.name}} has no owner                   │
│     Severity: Medium                                             │
│                                                                   │
│  [+ Add action]                                                  │
│                                                                   │
│  [Cancel]                                    [Save Automation]   │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Run History Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Unowned Asset Check - Run History                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ Jan 30, 9:00 AM    | 3 issues created | 1.2s                │
│  ✅ Jan 29, 9:00 AM    | 0 issues created | 0.8s                │
│  ✅ Jan 28, 9:00 AM    | 5 issues created | 1.5s                │
│  ❌ Jan 27, 9:00 AM    | Error: Timeout   | -                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Automations

### 1. Daily Unowned Asset Check
```typescript
{
  name: "Daily Unowned Asset Check",
  trigger: {
    type: "scheduled",
    interval: { type: "days", value: 1, at: "09:00" }
  },
  conditions: [
    { field: "owner", operator: "is_empty" }
  ],
  actions: [
    {
      type: "create_record",
      entityType: "issue",
      data: {
        title: "Asset '{{record.name}}' has no owner",
        description: "This asset was detected without an owner during automated governance check.",
        severity: "medium",
        asset_id: "{{record.id}}",
        type: "governance"
      }
    }
  ]
}
```

### 2. Auto-Assign Critical Issues
```typescript
{
  name: "Critical Issue Auto-Assign",
  trigger: {
    type: "record_created",
    entityType: "issue",
    filter: { field: "severity", operator: "equals", value: "critical" }
  },
  conditions: [
    { field: "assignee", operator: "is_empty" }
  ],
  actions: [
    {
      type: "generate_with_ai",
      prompt: "Based on this issue description, determine the best team to handle it: '{{record.description}}'. Options: data-engineering, data-quality, security, analytics. Return just the team name.",
      outputField: "recommended_team",
      outputType: "classification",
      options: { choices: ["data-engineering", "data-quality", "security", "analytics"] }
    },
    {
      type: "update_record",
      target: "trigger_record",
      updates: [
        { field: "assignee", value: "{{previous_action.result}}@company.com" }
      ]
    },
    {
      type: "send_notification",
      channel: "slack",
      slackChannel: "#critical-alerts",
      template: {
        body: "🚨 Critical issue auto-assigned!\nIssue: {{record.title}}\nAssigned to: {{previous_action.result}}"
      }
    }
  ]
}
```

### 3. Low Trust Score Alert
```typescript
{
  name: "Low Trust Score Alert",
  trigger: {
    type: "record_updated",
    entityType: "asset",
    watchFields: ["trust_score"]
  },
  conditions: [
    { field: "trust_score", operator: "less_than", value: 30 },
    { field: "layer", operator: "in", value: ["gold", "consumer"] }
  ],
  actions: [
    {
      type: "run_agent",
      agentName: "debugger",
      context: { assetId: "{{record.id}}" }
    },
    {
      type: "send_notification",
      channel: "email",
      recipients: ["{{record.owner}}", "data-governance@company.com"],
      template: {
        subject: "Trust Score Alert: {{record.name}}",
        body: "The asset '{{record.name}}' trust score dropped to {{record.trust_score}}. The Debugger agent has been triggered to investigate."
      }
    }
  ]
}
```

### 4. Issue Type Auto-Classification
```typescript
{
  name: "Issue Type Auto-Classification",
  trigger: {
    type: "record_created",
    entityType: "issue"
  },
  conditions: [
    { field: "type", operator: "is_empty" }
  ],
  actions: [
    {
      type: "generate_with_ai",
      prompt: "Classify this data quality issue based on its description: '{{record.description}}'\n\nCategories:\n- missing_data: Null values, empty fields\n- invalid_format: Wrong data types, format violations\n- outlier: Statistical anomalies, unexpected values\n- referential: Broken references, orphan records\n- stale: Outdated data, freshness issues\n- duplicate: Duplicate records\n\nReturn only the category name.",
      outputField: "classified_type",
      outputType: "classification",
      options: { choices: ["missing_data", "invalid_format", "outlier", "referential", "stale", "duplicate"] }
    },
    {
      type: "update_record",
      target: "trigger_record",
      updates: [
        { field: "type", value: "{{previous_action.result}}" }
      ]
    }
  ]
}
```

### 5. Monthly Stale Data Review
```typescript
{
  name: "Monthly Stale Data Review",
  trigger: {
    type: "scheduled",
    interval: { type: "months", value: 1, dayOfMonth: 1, at: "00:00" }
  },
  actions: [
    {
      type: "execute_webhook",
      url: "{{env.SLACK_WEBHOOK_URL}}",
      method: "POST",
      body: {
        text: "Monthly Data Staleness Report",
        attachments: [
          {
            title: "Assets not updated in 90+ days",
            text: "Review required for data governance compliance"
          }
        ]
      }
    }
  ]
}
```

---

## Implementation Plan

### Phase 1: Core Engine (Week 1)
- [ ] Create `AutomationEngine` class
- [ ] Implement trigger evaluation
- [ ] Implement condition evaluation
- [ ] Implement basic actions (update_record, create_record)
- [ ] Database migrations
- [ ] API endpoints for CRUD

### Phase 2: Scheduler (Week 1)
- [ ] Implement scheduled trigger execution
- [ ] Cron expression parser
- [ ] Job queue for scheduled runs
- [ ] Schedule management UI

### Phase 3: Event Triggers (Week 2)
- [ ] Database triggers for record_created/updated
- [ ] Agent completion hooks
- [ ] Webhook receiver endpoint
- [ ] Event debouncing (prevent duplicate triggers)

### Phase 4: Actions Library (Week 2)
- [ ] Send notification (email, Slack)
- [ ] Execute webhook
- [ ] Run agent
- [ ] Generate with AI
- [ ] Conditional branching

### Phase 5: UI (Week 2-3)
- [ ] Automations list page
- [ ] Visual automation builder
- [ ] Token autocomplete
- [ ] Run history viewer
- [ ] Test mode (dry run)

### Phase 6: Templates (Week 3)
- [ ] Pre-built automation templates
- [ ] Template gallery UI
- [ ] One-click template deployment

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Scheduler | Inngest or pg-boss | Reliable job scheduling |
| Event Bus | Supabase Realtime | Database change events |
| Token Parser | Custom (Handlebars-like) | Variable interpolation |
| AI Actions | Claude API | Intelligent decision making |
| Notifications | Resend + Slack API | Multi-channel alerts |

---

## Safety & Guardrails

### Rate Limiting
```typescript
const AUTOMATION_LIMITS = {
  maxRunsPerHour: 100,       // Per automation
  maxActionsPerRun: 20,      // Prevent infinite loops
  maxWebhookRetries: 3,
  webhookTimeout: 10000,     // 10 seconds
  cooldownMinutes: 1,        // Min time between same automation runs
};
```

### Dangerous Action Warnings
- DELETE operations require confirmation
- Bulk updates (>100 records) show preview
- External webhooks show security warning

### Audit Trail
- Every automation run logged
- Every action logged with input/output
- User attribution for all changes

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Automations created per user | 3+ |
| Manual tasks automated | 50% reduction |
| Time to issue assignment | < 5 minutes |
| Governance coverage | 90% of assets monitored |

---

## Open Questions

1. **Visual workflow builder?** Start with form-based, add visual later?
2. **Approval workflows?** Require approval for high-impact automations?
3. **Versioning?** Track automation changes over time?
4. **Marketplace?** Share automations between organizations?
5. **Testing mode?** Dry-run without executing actions?
6. **Chaining?** One automation trigger another?

---

## Related Documentation

- [Atlan Playbooks](https://docs.atlan.com/product/capabilities/governance/stewardship/how-tos/automate-data-governance)
- [Airtable Automations](https://support.airtable.com/docs/getting-started-with-airtable-automations)
- [n8n Workflows](https://docs.n8n.io/)
- [Transformation Agent](./FEAT-019-TRANSFORMATION-AGENT-SPEC.md)

---

## Sources

- [Atlan Data Governance Framework](https://atlan.com/data-governance-framework/)
- [Airtable Getting Started with Automations](https://support.airtable.com/docs/getting-started-with-airtable-automations)
- [Airtable Trigger Types](https://support.airtable.com/docs/airtable-triggers)
- [n8n Workflow Anatomy](https://medium.com/@Quaxel/the-anatomy-of-an-n8n-workflow-3ade4a335266)
- [Building Multi-step Workflows in n8n](https://www.augustinfotech.com/blogs/building-multi-step-workflows-in-n8n-from-trigger-to-action/)
