-- ============================================
-- ENHANCE COLUMN PROFILES FOR DATA STRUCTURE TAB
-- ============================================

-- Add new columns for per-column metadata
ALTER TABLE amygdala.column_profiles
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS business_terms TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS classifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]';

-- Add target_column to quality_rules if not exists (for linking rules to specific columns)
ALTER TABLE amygdala.quality_rules
ADD COLUMN IF NOT EXISTS target_column TEXT,
ADD COLUMN IF NOT EXISTS target_asset TEXT;

-- Create index for column lookups
CREATE INDEX IF NOT EXISTS idx_column_profiles_column_name ON amygdala.column_profiles(column_name);

-- Create index for quality rules by target column
CREATE INDEX IF NOT EXISTS idx_quality_rules_target_column ON amygdala.quality_rules(target_column);
CREATE INDEX IF NOT EXISTS idx_quality_rules_target_asset ON amygdala.quality_rules(target_asset);

-- Add comment to explain classifications
COMMENT ON COLUMN amygdala.column_profiles.classifications IS 'Array of classification tags: PII, PHI, PCI, Sensitive, Confidential, Internal, Public, or custom';
COMMENT ON COLUMN amygdala.column_profiles.business_terms IS 'Array of business glossary terms mapped to this column';
COMMENT ON COLUMN amygdala.column_profiles.highlights IS 'JSON array of key insights/warnings for this column';
