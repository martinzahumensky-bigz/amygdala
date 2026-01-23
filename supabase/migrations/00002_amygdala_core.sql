-- ============================================
-- AMYGDALA CORE TABLES
-- ============================================

-- Assets catalog
CREATE TABLE amygdala.assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('report', 'dashboard', 'table', 'view', 'api', 'file', 'application_screen')),
    layer TEXT NOT NULL CHECK (layer IN ('consumer', 'gold', 'silver', 'bronze', 'raw')),
    description TEXT,
    business_context TEXT,
    tags TEXT[] DEFAULT '{}',
    owner TEXT,
    steward TEXT,
    upstream_assets TEXT[] DEFAULT '{}',
    downstream_assets TEXT[] DEFAULT '{}',
    source_table TEXT,
    source_connection TEXT,
    quality_score DECIMAL(5,2),
    trust_score_stars INTEGER CHECK (trust_score_stars BETWEEN 1 AND 5),
    trust_score_raw DECIMAL(5,4),
    trust_explanation TEXT,
    fitness_status TEXT DEFAULT 'green' CHECK (fitness_status IN ('green', 'amber', 'red')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Column profiles
CREATE TABLE amygdala.column_profiles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    data_type TEXT,
    inferred_semantic_type TEXT,
    null_count BIGINT DEFAULT 0,
    null_percentage DECIMAL(5,2) DEFAULT 0,
    distinct_count BIGINT DEFAULT 0,
    distinct_percentage DECIMAL(5,2) DEFAULT 0,
    min_value JSONB,
    max_value JSONB,
    mean_value DECIMAL(20,4),
    median_value DECIMAL(20,4),
    std_dev DECIMAL(20,4),
    min_length INTEGER,
    max_length INTEGER,
    avg_length DECIMAL(10,2),
    top_values JSONB DEFAULT '[]',
    patterns JSONB DEFAULT '[]',
    profiled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality rules
CREATE TABLE amygdala.quality_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_type TEXT CHECK (rule_type IN ('completeness', 'validity', 'consistency', 'timeliness', 'uniqueness', 'accuracy')),
    expression TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    threshold DECIMAL(5,2) DEFAULT 95.00,
    pass_rate DECIMAL(5,2),
    last_executed TIMESTAMPTZ,
    last_result JSONB,
    rationale TEXT,
    auto_generated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues
CREATE TABLE amygdala.issues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    issue_type TEXT CHECK (issue_type IN ('anomaly', 'quality_failure', 'pipeline_failure', 'missing_data', 'missing_reference', 'ownership_missing', 'freshness')),
    affected_assets TEXT[] DEFAULT '{}',
    root_cause_asset TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'in_progress', 'escalated', 'pending_review', 'resolved', 'closed')),
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ
);

-- Issue activities
CREATE TABLE amygdala.issue_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    issue_id TEXT REFERENCES amygdala.issues(id) ON DELETE CASCADE,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent runs
CREATE TABLE amygdala.agent_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    error_message TEXT
);

-- Agent logs
CREATE TABLE amygdala.agent_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT NOT NULL,
    run_id TEXT REFERENCES amygdala.agent_runs(id) ON DELETE SET NULL,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    summary TEXT,
    details JSONB DEFAULT '{}',
    rating TEXT,
    score DECIMAL(5,2),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Lineage edges
CREATE TABLE amygdala.lineage (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    target_asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    transformation_type TEXT,
    transformation_logic TEXT,
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_asset_id, target_asset_id)
);

-- Snapshots for historical comparison
CREATE TABLE amygdala.snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    snapshot_type TEXT CHECK (snapshot_type IN ('metric', 'profile', 'distribution')),
    snapshot_data JSONB NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust score history
CREATE TABLE amygdala.trust_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    stars INTEGER CHECK (stars BETWEEN 1 AND 5),
    raw_score DECIMAL(5,4),
    factors JSONB,
    explanation TEXT,
    fitness_status TEXT,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assets_layer ON amygdala.assets(layer);
CREATE INDEX idx_assets_type ON amygdala.assets(asset_type);
CREATE INDEX idx_assets_fitness ON amygdala.assets(fitness_status);
CREATE INDEX idx_issues_status ON amygdala.issues(status);
CREATE INDEX idx_issues_severity ON amygdala.issues(severity);
CREATE INDEX idx_issues_created ON amygdala.issues(created_at DESC);
CREATE INDEX idx_agent_logs_agent ON amygdala.agent_logs(agent_name);
CREATE INDEX idx_agent_logs_asset ON amygdala.agent_logs(asset_id);
CREATE INDEX idx_agent_logs_timestamp ON amygdala.agent_logs(timestamp DESC);
CREATE INDEX idx_snapshots_asset ON amygdala.snapshots(asset_id);
CREATE INDEX idx_snapshots_captured ON amygdala.snapshots(captured_at DESC);
CREATE INDEX idx_column_profiles_asset ON amygdala.column_profiles(asset_id);
CREATE INDEX idx_quality_rules_asset ON amygdala.quality_rules(asset_id);
CREATE INDEX idx_lineage_source ON amygdala.lineage(source_asset_id);
CREATE INDEX idx_lineage_target ON amygdala.lineage(target_asset_id);

-- Enable RLS
ALTER TABLE amygdala.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.agent_runs ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all access to assets" ON amygdala.assets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to issues" ON amygdala.issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to agent_logs" ON amygdala.agent_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to agent_runs" ON amygdala.agent_runs FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION amygdala.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON amygdala.assets
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();

CREATE TRIGGER update_issues_updated_at
    BEFORE UPDATE ON amygdala.issues
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();
