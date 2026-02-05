// ============================================
// AMYGDALA CORE TYPES
// ============================================

// Asset types
export type AssetType = 'report' | 'dashboard' | 'table' | 'view' | 'api' | 'file' | 'application_screen';
export type DataLayer = 'consumer' | 'gold' | 'silver' | 'bronze' | 'raw';
export type FitnessStatus = 'green' | 'amber' | 'red';

export interface ColumnProfile {
  name: string;
  data_type: string;
  inferred_semantic_type?: string;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  distinct_percentage: number;
  min_value?: unknown;
  max_value?: unknown;
  mean_value?: number;
  top_values: Array<{ value: string; count: number }>;
  // New fields for Data Structure tab (FEAT-020)
  description?: string;
  business_terms?: string[];
  classifications?: string[];
  highlights?: Array<{ type: 'info' | 'warning' | 'error'; message: string }>;
  quality_rules?: Array<{
    id: string;
    name: string;
    rule_type: string;
    pass_rate?: number;
    threshold?: number;
  }>;
}

export interface Profile {
  row_count: number;
  column_count: number;
  size_bytes: number;
  last_updated?: string;
  columns: ColumnProfile[];
}

export interface TrustFactors {
  documentation: number;
  governance: number;
  quality: number;
  usage: number;
  reliability: number;
  freshness: number;
}

export interface TrustScore {
  stars: number;
  raw_score: number;
  factors: TrustFactors;
  explanation: string;
  calculated_at: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  layer: DataLayer;
  description?: string;
  business_context?: string;
  tags: string[];
  owner?: string;
  steward?: string;
  upstream_assets: string[];
  downstream_assets: string[];
  quality_score?: number;
  trust_score_stars?: number;
  trust_score_raw?: number;
  trust_explanation?: string;
  fitness_status: FitnessStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AssetInsert {
  name: string;
  asset_type: AssetType;
  layer: DataLayer;
  description?: string;
  business_context?: string;
  tags?: string[];
  owner?: string;
  steward?: string;
  upstream_assets?: string[];
  downstream_assets?: string[];
}

// Issue types
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueType =
  | 'anomaly'
  | 'quality_failure'
  | 'pipeline_failure'
  | 'missing_data'
  | 'missing_reference'
  | 'ownership_missing'
  | 'freshness';
export type IssueStatus =
  | 'open'
  | 'investigating'
  | 'in_progress'
  | 'escalated'
  | 'pending_review'
  | 'resolved'
  | 'closed';

export interface IssueActivity {
  id: string;
  issue_id: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  issue_type: IssueType;
  affected_assets: string[];
  root_cause_asset?: string;
  status: IssueStatus;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface IssueInsert {
  title: string;
  description: string;
  severity: IssueSeverity;
  issue_type: IssueType;
  affected_assets?: string[];
  created_by: string;
  assigned_to?: string;
}

// Agent types
export type AgentName =
  | 'Documentarist'
  | 'Spotter'
  | 'Debugger'
  | 'Quality Agent'
  | 'Transformation Agent'
  | 'Trust Agent';

export type AgentStatus = 'idle' | 'running' | 'error';

export interface AgentLog {
  id: string;
  agent_name: AgentName;
  asset_id?: string;
  action: string;
  summary: string;
  details?: Record<string, unknown>;
  rating?: string;
  score?: number;
  timestamp: string;
}

export interface AgentState {
  name: AgentName;
  description: string;
  status: AgentStatus;
  last_run?: string;
  stats: Record<string, string | number>;
}

// Quality types
export type QualityRuleType =
  | 'completeness'
  | 'validity'
  | 'consistency'
  | 'timeliness'
  | 'uniqueness'
  | 'accuracy';

export interface QualityRule {
  id: string;
  asset_id: string;
  name: string;
  rule_type: QualityRuleType;
  expression: string;
  severity: IssueSeverity;
  pass_rate?: number;
  last_executed?: string;
  last_result?: Record<string, unknown>;
  rationale: string;
  auto_generated: boolean;
  created_by: string;
  created_at: string;
}

// Snapshot types
export type SnapshotType = 'metric' | 'profile' | 'distribution';

export interface Snapshot {
  id: string;
  asset_id: string;
  snapshot_type: SnapshotType;
  snapshot_data: Record<string, unknown>;
  captured_at: string;
}

// ============================================
// MERIDIAN BANK TYPES
// ============================================

export interface MeridianBranch {
  branch_id: string;
  branch_name: string;
  region: string;
  city: string;
  state?: string;
  country: string;
  manager_name?: string;
  opened_date?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface MeridianCustomer {
  customer_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  email_valid?: boolean;
  phone?: string;
  phone_valid?: boolean;
  phone_normalized?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  date_of_birth?: string;
  segment_id?: string;
  segment_name?: string;
  created_at: string;
}

export interface MeridianTransaction {
  transaction_id: string;
  account_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'payment';
  branch_id?: string;
  branch_name?: string;
  description?: string;
  created_at: string;
}

export interface MeridianLoan {
  loan_id: string;
  customer_id: string;
  customer_name?: string;
  product_id: string;
  product_name?: string;
  principal_amount: number;
  current_balance?: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  maturity_date: string;
  collateral_value?: number;
  ltv_ratio?: number;
  status: 'active' | 'closed' | 'defaulted';
  is_performing: boolean;
  created_at: string;
}

export interface MeridianDailyRevenue {
  date: string;
  total_revenue: number;
  interest_income: number;
  fee_income: number;
  transaction_count: number;
  avg_transaction_value: number;
  revenue_target?: number;
  variance_to_target?: number;
  calculated_at: string;
}

export interface MeridianBranchMetrics {
  date: string;
  branch_id: string;
  branch_name: string;
  region: string;
  transaction_count: number;
  total_amount: number;
  avg_transaction_value: number;
  customer_count: number;
  calculated_at: string;
}

export interface MeridianPipeline {
  id: string;
  name: string;
  source_table: string;
  target_table: string;
  schedule: string;
  last_run?: string;
  last_status: 'success' | 'failed' | 'running' | 'pending';
  error_message?: string;
  created_at: string;
}

// ============================================
// AUTOMATION TYPES (FEAT-023)
// ============================================

// Trigger Types
export type AutomationTriggerType =
  | 'scheduled'
  | 'record_created'
  | 'record_updated'
  | 'record_matches'
  | 'agent_completed'
  | 'webhook'
  | 'manual';

export type AutomationEntityType = 'asset' | 'issue' | 'data_product' | 'quality_rule';

export interface ScheduledTrigger {
  type: 'scheduled';
  interval: {
    type: 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'cron';
    value: number | string;
    at?: string; // Time of day (HH:mm)
    daysOfWeek?: number[]; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
}

export interface RecordCreatedTrigger {
  type: 'record_created';
  entityType: AutomationEntityType;
  filter?: AutomationCondition;
}

export interface RecordUpdatedTrigger {
  type: 'record_updated';
  entityType: AutomationEntityType;
  watchFields?: string[];
  filter?: AutomationCondition;
}

export interface RecordMatchesTrigger {
  type: 'record_matches';
  entityType: AutomationEntityType;
  conditions: AutomationCondition[];
  checkInterval?: number; // Minutes between checks
}

export interface AgentCompletedTrigger {
  type: 'agent_completed';
  agentName?: string;
  status?: 'success' | 'failed' | 'any';
  resultFilter?: AutomationCondition;
}

export interface WebhookTrigger {
  type: 'webhook';
  webhookId: string;
  secret?: string;
}

export interface ManualTrigger {
  type: 'manual';
  buttonLabel: string;
  showOn: ('asset_detail' | 'issue_detail' | 'automation_list')[];
  requireConfirmation?: boolean;
}

export type AutomationTrigger =
  | ScheduledTrigger
  | RecordCreatedTrigger
  | RecordUpdatedTrigger
  | RecordMatchesTrigger
  | AgentCompletedTrigger
  | WebhookTrigger
  | ManualTrigger;

// Condition Types
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  logic?: 'and' | 'or';
}

// Action Types
export type AutomationActionType =
  | 'update_record'
  | 'create_record'
  | 'send_notification'
  | 'run_agent'
  | 'execute_webhook'
  | 'generate_with_ai'
  | 'delay'
  | 'conditional_branch'
  | 'check_ataccama_dq';

export interface UpdateRecordAction {
  type: 'update_record';
  target: 'trigger_record' | 'related_record';
  relatedRecordQuery?: {
    entityType: AutomationEntityType;
    filter: AutomationCondition[];
  };
  updates: Array<{
    field: string;
    value: unknown; // Can include tokens like {{record.name}}
  }>;
}

export interface CreateRecordAction {
  type: 'create_record';
  entityType: 'issue' | 'data_product';
  data: Record<string, unknown>;
}

export interface SendNotificationAction {
  type: 'send_notification';
  channel: 'email' | 'slack' | 'webhook';
  recipients?: string[];
  slackChannel?: string;
  webhookUrl?: string;
  template: {
    subject?: string;
    body: string;
  };
}

export interface RunAgentAction {
  type: 'run_agent';
  agentName: 'spotter' | 'debugger' | 'quality' | 'documentarist' | 'trust' | 'transformation' | 'analyst';
  context?: {
    assetId?: string;
    issueId?: string;
    parameters?: Record<string, unknown>;
  };
  waitForCompletion?: boolean;
}

export interface CheckAtaccamaDQAction {
  type: 'check_ataccama_dq';
  tables: string[]; // List of table names to check in Ataccama
  thresholds?: {
    excellent: number; // Default 90
    good: number;      // Default 75
    fair: number;      // Default 60
  };
  connectionTypes?: string[]; // Filter by connection type (snowflake, oracle, etc.)
  createIssueOnFailure?: boolean; // Create issue if DQ below threshold
  failureThreshold?: number; // DQ score below which to create issue (default 60)
}

export interface ExecuteWebhookAction {
  type: 'execute_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  retryOnFailure?: boolean;
  retryCount?: number;
}

export interface GenerateWithAIAction {
  type: 'generate_with_ai';
  prompt: string;
  outputField: string;
  outputType: 'text' | 'json' | 'classification';
  options?: {
    choices?: string[];
    maxTokens?: number;
  };
}

export interface DelayAction {
  type: 'delay';
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
}

export interface ConditionalBranchAction {
  type: 'conditional_branch';
  conditions: AutomationCondition[];
  ifTrue: AutomationAction[];
  ifFalse?: AutomationAction[];
}

export type AutomationAction =
  | UpdateRecordAction
  | CreateRecordAction
  | SendNotificationAction
  | RunAgentAction
  | ExecuteWebhookAction
  | GenerateWithAIAction
  | DelayAction
  | ConditionalBranchAction
  | CheckAtaccamaDQAction;

// Settings
export interface AutomationSettings {
  runLimit?: number;
  cooldownMinutes?: number;
  errorHandling: 'stop' | 'continue' | 'notify';
}

// Main Automation Interface
export interface Automation {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  settings: AutomationSettings;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  run_count: number;
}

export interface AutomationInsert {
  name: string;
  description?: string;
  enabled?: boolean;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  settings?: Partial<AutomationSettings>;
  created_by: string;
}

// Automation Run
export type AutomationRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface AutomationActionResult {
  actionType: AutomationActionType;
  actionIndex: number;
  status: 'success' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  duration_ms: number;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  trigger_type: AutomationTriggerType;
  trigger_data?: Record<string, unknown>;
  status: AutomationRunStatus;
  actions_executed: AutomationActionResult[];
  records_processed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

// Schedule
export interface AutomationSchedule {
  id: string;
  automation_id: string;
  next_run_at: string;
  last_run_at?: string;
}

// Webhook
export interface AutomationWebhook {
  id: string;
  automation_id: string;
  webhook_id: string;
  secret?: string;
  created_at: string;
  last_called_at?: string;
  call_count: number;
}
