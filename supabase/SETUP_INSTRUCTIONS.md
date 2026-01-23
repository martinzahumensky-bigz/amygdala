# Database Setup Instructions

Due to IPv6 connectivity issues on some networks, you may need to run the migrations manually through the Supabase Dashboard.

## Option 1: Supabase Dashboard SQL Editor

1. Go to https://supabase.com/dashboard/project/xfcqszmaoxiilzudvguy/sql/new
2. Copy and paste the contents of each migration file in order:
   - `migrations/00001_create_schemas.sql`
   - `migrations/00002_amygdala_core.sql`
   - `migrations/00003_meridian_bank.sql`
3. Click "Run" for each

## Option 2: Combined Migration

Run this single SQL file that combines all migrations:

```bash
# Copy the combined SQL below into the Supabase SQL Editor
```

## Combined SQL Migration

Copy everything below this line into the SQL Editor:

---

```sql
-- ============================================
-- MIGRATION 1: CREATE SCHEMAS
-- ============================================

CREATE SCHEMA IF NOT EXISTS amygdala;
CREATE SCHEMA IF NOT EXISTS meridian;

GRANT USAGE ON SCHEMA amygdala TO authenticated;
GRANT USAGE ON SCHEMA meridian TO authenticated;
GRANT USAGE ON SCHEMA amygdala TO anon;
GRANT USAGE ON SCHEMA meridian TO anon;

-- ============================================
-- MIGRATION 2: AMYGDALA CORE TABLES
-- ============================================

-- Assets catalog
CREATE TABLE IF NOT EXISTS amygdala.assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    layer TEXT NOT NULL,
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
    trust_score_stars INTEGER,
    trust_score_raw DECIMAL(5,4),
    trust_explanation TEXT,
    fitness_status TEXT DEFAULT 'green',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT
);

-- Issues
CREATE TABLE IF NOT EXISTS amygdala.issues (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    issue_type TEXT,
    affected_assets TEXT[] DEFAULT '{}',
    root_cause_asset TEXT,
    status TEXT DEFAULT 'open',
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ
);

-- Issue activities
CREATE TABLE IF NOT EXISTS amygdala.issue_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    issue_id TEXT,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Agent runs
CREATE TABLE IF NOT EXISTS amygdala.agent_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    error_message TEXT
);

-- Agent logs
CREATE TABLE IF NOT EXISTS amygdala.agent_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agent_name TEXT NOT NULL,
    run_id TEXT,
    asset_id TEXT,
    action TEXT NOT NULL,
    summary TEXT,
    details JSONB DEFAULT '{}',
    rating TEXT,
    score DECIMAL(5,2),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshots
CREATE TABLE IF NOT EXISTS amygdala.snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    asset_id TEXT,
    snapshot_type TEXT,
    snapshot_data JSONB NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_layer ON amygdala.assets(layer);
CREATE INDEX IF NOT EXISTS idx_assets_type ON amygdala.assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_issues_status ON amygdala.issues(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON amygdala.agent_logs(agent_name);

-- ============================================
-- MIGRATION 3: MERIDIAN BANK TABLES
-- ============================================

-- Reference Data
CREATE TABLE IF NOT EXISTS meridian.ref_branches (
    branch_id TEXT PRIMARY KEY,
    branch_name TEXT NOT NULL,
    region TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'USA',
    manager_name TEXT,
    opened_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian.ref_customer_segments (
    segment_id TEXT PRIMARY KEY,
    segment_name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Silver Layer
CREATE TABLE IF NOT EXISTS meridian.silver_customers (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    email_valid BOOLEAN DEFAULT false,
    phone TEXT,
    phone_valid BOOLEAN DEFAULT false,
    phone_normalized TEXT,
    city TEXT,
    state TEXT,
    segment_id TEXT,
    segment_name TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian.silver_transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT,
    customer_id TEXT,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type TEXT NOT NULL,
    branch_id TEXT,
    branch_name TEXT,
    region TEXT,
    description TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gold Layer
CREATE TABLE IF NOT EXISTS meridian.gold_daily_revenue (
    date DATE PRIMARY KEY,
    total_revenue DECIMAL(15,2) NOT NULL,
    interest_income DECIMAL(15,2) DEFAULT 0,
    fee_income DECIMAL(15,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(15,2),
    revenue_target DECIMAL(15,2),
    variance_to_target DECIMAL(15,2),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian.gold_branch_metrics (
    date DATE,
    branch_id TEXT,
    branch_name TEXT,
    region TEXT,
    transaction_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2),
    customer_count INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (date, branch_id)
);

-- Pipelines
CREATE TABLE IF NOT EXISTS meridian.pipelines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    source_table TEXT,
    target_table TEXT,
    schedule TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meridian.pipeline_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id TEXT,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rows_processed INTEGER DEFAULT 0,
    error_message TEXT,
    run_metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_silver_transactions_date ON meridian.silver_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gold_branch_metrics_date ON meridian.gold_branch_metrics(date);
```

## Verify Setup

After running the migrations, verify by running:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('amygdala', 'meridian')
ORDER BY table_schema, table_name;
```

You should see tables in both the `amygdala` and `meridian` schemas.
