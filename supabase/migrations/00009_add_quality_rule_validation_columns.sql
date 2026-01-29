-- Add columns to store validation results in quality_rules table
-- This allows the UI to display actual pass rates from rule validation

-- Add validation result columns
ALTER TABLE amygdala.quality_rules
ADD COLUMN IF NOT EXISTS last_pass_rate NUMERIC,
ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_total_records INTEGER,
ADD COLUMN IF NOT EXISTS last_passed_records INTEGER,
ADD COLUMN IF NOT EXISTS last_failed_records INTEGER;

-- Add index for finding rules that need validation
CREATE INDEX IF NOT EXISTS idx_quality_rules_last_validated
ON amygdala.quality_rules(last_validated_at);

COMMENT ON COLUMN amygdala.quality_rules.last_pass_rate IS 'Pass rate (0-100) from the most recent validation run';
COMMENT ON COLUMN amygdala.quality_rules.last_validated_at IS 'Timestamp of the most recent validation run';
COMMENT ON COLUMN amygdala.quality_rules.last_total_records IS 'Total records checked in the most recent validation';
