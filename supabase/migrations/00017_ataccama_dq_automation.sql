-- FEAT-025 Extension: Ataccama DQ Check Automation Template
-- Adds a pre-built automation for daily data quality checks via Ataccama MCP

-- ============================================================================
-- SEED DATA: Daily Key Tables DQ Report
-- ============================================================================

-- 5. Daily Key Tables Data Quality Report (Ataccama)
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Daily Key Tables DQ Report',
  'Checks data quality of key business tables via Ataccama MCP every day at 8 AM and sends a report. Creates issues for tables below quality threshold.',
  false,  -- Disabled by default (template)
  '{
    "type": "scheduled",
    "interval": {
      "type": "days",
      "value": 1,
      "at": "08:00"
    }
  }'::jsonb,
  '[]'::jsonb,
  '[
    {
      "type": "check_ataccama_dq",
      "tables": ["BANK_TRANSACTIONS", "CUSTOMER_360", "TRANSACTIONS_GOLD", "REVENUE_DAILY"],
      "thresholds": {
        "excellent": 90,
        "good": 75,
        "fair": 60
      },
      "createIssueOnFailure": true,
      "failureThreshold": 70
    },
    {
      "type": "send_notification",
      "channel": "email",
      "recipients": ["data-team@company.com"],
      "template": {
        "subject": "Daily Data Quality Report - {{trigger.timestamp}}",
        "body": "{{previous_action.result.report}}"
      }
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

-- 6. Weekly Data Quality Trend Check
INSERT INTO amygdala.automations (name, description, enabled, trigger, conditions, actions, created_by)
VALUES (
  'Weekly DQ Trend Analysis',
  'Runs comprehensive DQ check on all critical tables weekly and alerts on any degradation',
  false,  -- Disabled by default (template)
  '{
    "type": "scheduled",
    "interval": {
      "type": "weeks",
      "value": 1,
      "at": "06:00",
      "dayOfWeek": 1
    }
  }'::jsonb,
  '[]'::jsonb,
  '[
    {
      "type": "check_ataccama_dq",
      "tables": ["CUSTOMER_360", "CUSTOMER_RAW", "TRANSACTIONS_GOLD", "REVENUE_DAILY", "FRAUD_EVENTS", "BANK_TRANSACTIONS"],
      "thresholds": {
        "excellent": 90,
        "good": 75,
        "fair": 60
      },
      "createIssueOnFailure": true,
      "failureThreshold": 60
    },
    {
      "type": "conditional_branch",
      "conditions": [
        {
          "field": "previous_action.result.summary.allTrusted",
          "operator": "equals",
          "value": false
        }
      ],
      "ifTrue": [
        {
          "type": "send_notification",
          "channel": "webhook",
          "webhookUrl": "{{env.SLACK_WEBHOOK_URL}}",
          "template": {
            "body": "⚠️ *Weekly DQ Alert*: Some tables are below quality threshold!\n\n{{previous_action.result.report}}"
          }
        }
      ],
      "ifFalse": [
        {
          "type": "send_notification",
          "channel": "email",
          "recipients": ["data-team@company.com"],
          "template": {
            "subject": "✅ Weekly DQ Report - All Systems Healthy",
            "body": "All monitored tables passed quality thresholds.\n\n{{previous_action.result.report}}"
          }
        }
      ]
    }
  ]'::jsonb,
  'system'
) ON CONFLICT DO NOTHING;

COMMENT ON COLUMN amygdala.automations.actions IS 'Actions to execute. Includes check_ataccama_dq for Ataccama MCP integration.';
