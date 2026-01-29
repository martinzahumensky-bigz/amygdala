-- Fix missing columns in quality_rules table
-- This migration adds columns that may have been missed in earlier deployments

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'description') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ensure all required columns exist with correct types
DO $$
BEGIN
    -- Check and add target_asset
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'target_asset') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN target_asset TEXT NOT NULL DEFAULT '';
    END IF;

    -- Check and add target_column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'target_column') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN target_column TEXT;
    END IF;

    -- Check and add expression
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'expression') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN expression TEXT NOT NULL DEFAULT '';
    END IF;

    -- Check and add threshold
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'threshold') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN threshold NUMERIC NOT NULL DEFAULT 95;
    END IF;

    -- Check and add severity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'severity') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN severity TEXT NOT NULL DEFAULT 'medium';
    END IF;

    -- Check and add enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'enabled') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT true;
    END IF;

    -- Check and add metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'metadata') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- Check and add created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'amygdala' AND table_name = 'quality_rules' AND column_name = 'created_by') THEN
        ALTER TABLE amygdala.quality_rules ADD COLUMN created_by TEXT DEFAULT 'system';
    END IF;
END $$;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_quality_rules_target_asset ON amygdala.quality_rules(target_asset);
CREATE INDEX IF NOT EXISTS idx_quality_rules_enabled ON amygdala.quality_rules(enabled) WHERE enabled = true;

-- Grant permissions
GRANT ALL ON amygdala.quality_rules TO authenticated;
GRANT ALL ON amygdala.quality_rules TO anon;
GRANT ALL ON amygdala.quality_rules TO service_role;
