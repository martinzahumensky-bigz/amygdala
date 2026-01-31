-- FEAT-023: Automation Agent - Custom Trigger-Action Workflows
-- Enables users to create rule-based workflows that execute automatically

-- ============================================================================
-- AUTOMATIONS TABLE (Main definitions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS amygdala.automations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Trigger configuration (JSON)
  -- Types: scheduled, record_created, record_updated, record_matches, agent_completed, webhook, manual
  trigger JSONB NOT NULL,

  -- Optional conditions for filtering (JSON array)
  conditions JSONB DEFAULT '[]'::jsonb,

  -- Actions to execute (JSON array)
  actions JSONB NOT NULL,

  -- Settings for rate limiting, error handling
  settings JSONB DEFAULT '{
    "errorHandling": "notify",
    "runLimit": null,
    "cooldownMinutes": null
  }'::jsonb,

  -- Audit fields
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0
);

-- ============================================================================
-- AUTOMATION RUNS TABLE (Execution history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS amygdala.automation_runs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  automation_id TEXT NOT NULL REFERENCES amygdala.automations(id) ON DELETE CASCADE,

  -- Trigger information
  trigger_type TEXT NOT NULL,
  trigger_data JSONB,  -- Data that triggered the run

  -- Execution status: pending, running, success, failed, skipped
  status TEXT NOT NULL DEFAULT 'pending',

  -- Execution details
  actions_executed JSONB DEFAULT '[]'::jsonb,  -- Log of each action with results
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- ============================================================================
-- AUTOMATION SCHEDULES TABLE (Scheduled trigger tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS amygdala.automation_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  automation_id TEXT NOT NULL REFERENCES amygdala.automations(id) ON DELETE CASCADE,

  -- Next scheduled execution time
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,

  -- Ensure one schedule per automation
  UNIQUE(automation_id)
);

-- ============================================================================
-- AUTOMATION WEBHOOKS TABLE (Webhook endpoints)
-- ============================================================================
CREATE TABLE IF NOT EXISTS amygdala.automation_webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  automation_id TEXT NOT NULL REFERENCES amygdala.automations(id) ON DELETE CASCADE,

  -- Public webhook identifier for URL construction
  webhook_id TEXT NOT NULL UNIQUE,

  -- Optional secret for request validation
  secret TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_called_at TIMESTAMPTZ,
  call_count INTEGER DEFAULT 0,

  -- Ensure one webhook per automation
  UNIQUE(automation_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Automations
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON amygdala.automations(enabled);
CREATE INDEX IF NOT EXISTS idx_automations_created_by ON amygdala.automations(created_by);
CREATE INDEX IF NOT EXISTS idx_automations_last_run ON amygdala.automations(last_run_at);

-- Automation Runs
CREATE INDEX IF NOT EXISTS idx_automation_runs_automation ON amygdala.automation_runs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON amygdala.automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_started ON amygdala.automation_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_trigger_type ON amygdala.automation_runs(trigger_type);

-- Automation Schedules
CREATE INDEX IF NOT EXISTS idx_automation_schedules_next ON amygdala.automation_schedules(next_run_at);

-- Automation Webhooks
CREATE INDEX IF NOT EXISTS idx_automation_webhooks_webhook_id ON amygdala.automation_webhooks(webhook_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE amygdala.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.automation_webhooks ENABLE ROW LEVEL SECURITY;

-- Permissive policies (can be restricted later)
CREATE POLICY "Allow all access to automations" ON amygdala.automations FOR ALL USING (true);
CREATE POLICY "Allow all access to automation_runs" ON amygdala.automation_runs FOR ALL USING (true);
CREATE POLICY "Allow all access to automation_schedules" ON amygdala.automation_schedules FOR ALL USING (true);
CREATE POLICY "Allow all access to automation_webhooks" ON amygdala.automation_webhooks FOR ALL USING (true);

-- ============================================================================
-- UPDATE TRIGGER (auto-update updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION amygdala.update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automations_updated_at
  BEFORE UPDATE ON amygdala.automations
  FOR EACH ROW
  EXECUTE FUNCTION amygdala.update_automations_updated_at();

-- ============================================================================
-- SEED DATA: Example Automations (templates)
-- ============================================================================

-- 1. Daily Unowned Asset Check
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Daily Unowned Asset Check',
  'Automatically creates issues for assets without an assigned owner, running every day at 9 AM',
  false,  -- Disabled by default (template)
  '{
    "type": "scheduled",
    "interval": {
      "type": "days",
      "value": 1,
      "at": "09:00"
    }
  }'::jsonb,
  '[
    {
      "field": "owner",
      "operator": "is_empty"
    }
  ]'::jsonb,
  '[
    {
      "type": "create_record",
      "entityType": "issue",
      "data": {
        "title": "Asset ''{{record.name}}'' has no owner",
        "description": "This asset was detected without an owner during automated governance check. Please assign ownership.",
        "severity": "medium",
        "asset_id": "{{record.id}}",
        "issue_type": "governance"
      }
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

-- 2. Critical Issue Auto-Alert
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Critical Issue Alert',
  'Sends notification when a critical issue is created',
  false,  -- Disabled by default (template)
  '{
    "type": "record_created",
    "entityType": "issue",
    "filter": {
      "field": "severity",
      "operator": "equals",
      "value": "critical"
    }
  }'::jsonb,
  '[]'::jsonb,
  '[
    {
      "type": "send_notification",
      "channel": "webhook",
      "webhookUrl": "{{env.SLACK_WEBHOOK_URL}}",
      "template": {
        "body": "Critical issue detected: {{record.title}}\nAffected Asset: {{record.affected_assets}}\nCreated by: {{record.created_by}}"
      }
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

-- 3. Low Trust Score Monitor
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Low Trust Score Monitor',
  'Triggers Debugger agent when an asset''s trust score drops below 30',
  false,  -- Disabled by default (template)
  '{
    "type": "record_matches",
    "entityType": "asset",
    "conditions": [
      {
        "field": "trust_score_stars",
        "operator": "less_than",
        "value": 2
      }
    ],
    "checkInterval": 60
  }'::jsonb,
  '[
    {
      "field": "layer",
      "operator": "in",
      "value": ["gold", "silver"]
    }
  ]'::jsonb,
  '[
    {
      "type": "run_agent",
      "agentName": "debugger",
      "context": {
        "assetId": "{{record.id}}"
      }
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

-- 4. Auto-Classify Issue Type
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Issue Type Auto-Classification',
  'Uses AI to automatically classify new issues without a type',
  false,  -- Disabled by default (template)
  '{
    "type": "record_created",
    "entityType": "issue"
  }'::jsonb,
  '[
    {
      "field": "issue_type",
      "operator": "is_empty"
    }
  ]'::jsonb,
  '[
    {
      "type": "generate_with_ai",
      "prompt": "Classify this data quality issue based on its title and description: ''{{record.title}}'' - ''{{record.description}}''\n\nCategories:\n- missing_data: Null values, empty fields\n- invalid_format: Wrong data types, format violations\n- outlier: Statistical anomalies\n- referential: Broken references\n- stale: Outdated data\n- duplicate: Duplicate records\n- governance: Policy violations\n\nReturn only the category name.",
      "outputField": "classified_type",
      "outputType": "classification",
      "options": {
        "choices": ["missing_data", "invalid_format", "outlier", "referential", "stale", "duplicate", "governance"]
      }
    },
    {
      "type": "update_record",
      "target": "trigger_record",
      "updates": [
        {
          "field": "issue_type",
          "value": "{{previous_action.result}}"
        }
      ]
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE amygdala.automations IS 'Custom trigger-action workflows for automation (FEAT-023)';
COMMENT ON TABLE amygdala.automation_runs IS 'Execution history for automations';
COMMENT ON TABLE amygdala.automation_schedules IS 'Schedule tracking for time-based automations';
COMMENT ON TABLE amygdala.automation_webhooks IS 'Webhook endpoints for external triggers';
