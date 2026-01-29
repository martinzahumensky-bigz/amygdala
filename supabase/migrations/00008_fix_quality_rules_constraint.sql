-- Fix the rule_type check constraint on quality_rules table
-- The constraint may have incorrect values preventing proper rule saving

-- Drop existing constraint if it exists
ALTER TABLE amygdala.quality_rules DROP CONSTRAINT IF EXISTS quality_rules_rule_type_check;

-- Add the correct constraint with all valid rule types
ALTER TABLE amygdala.quality_rules ADD CONSTRAINT quality_rules_rule_type_check
    CHECK (rule_type IN ('null_check', 'range_check', 'pattern_check', 'uniqueness', 'referential', 'custom'));

-- Also ensure severity constraint is correct
ALTER TABLE amygdala.quality_rules DROP CONSTRAINT IF EXISTS quality_rules_severity_check;
ALTER TABLE amygdala.quality_rules ADD CONSTRAINT quality_rules_severity_check
    CHECK (severity IN ('critical', 'high', 'medium', 'low'));

-- Clear any invalid rules that might have been partially saved
DELETE FROM amygdala.quality_rules WHERE rule_type IS NULL OR rule_type = '';
