-- ============================================
-- MERIDIAN BANK - SIMULATED BANKING DATA
-- ============================================

-- Reference Data Tables
-- ============================================

CREATE TABLE meridian.ref_branches (
    branch_id TEXT PRIMARY KEY,
    branch_name TEXT NOT NULL,
    region TEXT NOT NULL CHECK (region IN ('East', 'West', 'North', 'South', 'Central')),
    city TEXT NOT NULL,
    state TEXT,
    country TEXT DEFAULT 'USA',
    manager_name TEXT,
    opened_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.ref_products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL CHECK (product_category IN ('checking', 'savings', 'loan', 'mortgage', 'credit_card', 'investment')),
    interest_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.ref_customer_segments (
    segment_id TEXT PRIMARY KEY,
    segment_name TEXT NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bronze Layer (Raw Loaded Data)
-- ============================================

CREATE TABLE meridian.bronze_customers (
    customer_id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    date_of_birth DATE,
    segment_id TEXT,
    source_file TEXT,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.bronze_transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT,
    transaction_date DATE,
    amount DECIMAL(15,2),
    transaction_type TEXT,
    branch_id TEXT,
    description TEXT,
    source_file TEXT,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.bronze_loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT,
    product_id TEXT,
    principal_amount DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    term_months INTEGER,
    start_date DATE,
    maturity_date DATE,
    collateral_value DECIMAL(15,2),
    status TEXT,
    source_file TEXT,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.bronze_accounts (
    account_id TEXT PRIMARY KEY,
    customer_id TEXT,
    account_type TEXT,
    balance DECIMAL(15,2),
    opened_date DATE,
    status TEXT,
    branch_id TEXT,
    source_file TEXT,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Silver Layer (Cleaned & Transformed)
-- ============================================

CREATE TABLE meridian.silver_customers (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    email_valid BOOLEAN DEFAULT false,
    phone TEXT,
    phone_valid BOOLEAN DEFAULT false,
    phone_normalized TEXT,
    address_full TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    date_of_birth DATE,
    age INTEGER,
    segment_id TEXT REFERENCES meridian.ref_customer_segments(segment_id),
    segment_name TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.silver_transactions (
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

CREATE TABLE meridian.silver_loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES meridian.silver_customers(customer_id),
    customer_name TEXT,
    product_id TEXT REFERENCES meridian.ref_products(product_id),
    product_name TEXT,
    principal_amount DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    term_months INTEGER,
    start_date DATE,
    maturity_date DATE,
    collateral_value DECIMAL(15,2),
    ltv_ratio DECIMAL(5,2),
    status TEXT,
    is_performing BOOLEAN DEFAULT true,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.silver_accounts (
    account_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES meridian.silver_customers(customer_id),
    customer_name TEXT,
    account_type TEXT,
    balance DECIMAL(15,2),
    opened_date DATE,
    status TEXT,
    branch_id TEXT REFERENCES meridian.ref_branches(branch_id),
    branch_name TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gold Layer (Aggregated for Reporting)
-- ============================================

CREATE TABLE meridian.gold_daily_revenue (
    date DATE PRIMARY KEY,
    total_revenue DECIMAL(15,2) NOT NULL,
    interest_income DECIMAL(15,2) DEFAULT 0,
    fee_income DECIMAL(15,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    avg_transaction_value DECIMAL(15,2),
    revenue_target DECIMAL(15,2),
    variance_to_target DECIMAL(15,2),
    variance_percentage DECIMAL(5,2),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.gold_branch_metrics (
    date DATE,
    branch_id TEXT,
    branch_name TEXT,
    region TEXT,
    transaction_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    avg_transaction_value DECIMAL(15,2),
    customer_count INTEGER DEFAULT 0,
    PRIMARY KEY (date, branch_id),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.gold_loan_summary (
    date DATE PRIMARY KEY,
    total_loans_outstanding DECIMAL(15,2),
    total_loan_count INTEGER,
    avg_loan_size DECIMAL(15,2),
    total_collateral_value DECIMAL(15,2),
    collateral_coverage_ratio DECIMAL(5,2),
    npl_amount DECIMAL(15,2),
    npl_count INTEGER,
    npl_ratio DECIMAL(5,2),
    loans_by_product JSONB,
    loans_by_status JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.gold_customer_360 (
    customer_id TEXT PRIMARY KEY REFERENCES meridian.silver_customers(customer_id),
    full_name TEXT,
    email TEXT,
    email_valid BOOLEAN,
    phone TEXT,
    phone_valid BOOLEAN,
    segment_name TEXT,
    total_accounts INTEGER DEFAULT 0,
    total_balance DECIMAL(15,2) DEFAULT 0,
    total_loans INTEGER DEFAULT 0,
    total_loan_balance DECIMAL(15,2) DEFAULT 0,
    lifetime_transactions INTEGER DEFAULT 0,
    lifetime_value DECIMAL(15,2) DEFAULT 0,
    risk_score INTEGER,
    last_transaction_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Management
-- ============================================

CREATE TABLE meridian.pipelines (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    source_table TEXT,
    target_table TEXT,
    schedule TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meridian.pipeline_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id TEXT REFERENCES meridian.pipelines(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    rows_processed INTEGER DEFAULT 0,
    error_message TEXT,
    run_metadata JSONB DEFAULT '{}'
);

-- Indexes for Meridian Bank
-- ============================================

CREATE INDEX idx_bronze_transactions_date ON meridian.bronze_transactions(transaction_date);
CREATE INDEX idx_bronze_transactions_branch ON meridian.bronze_transactions(branch_id);
CREATE INDEX idx_silver_transactions_date ON meridian.silver_transactions(transaction_date);
CREATE INDEX idx_silver_transactions_branch ON meridian.silver_transactions(branch_id);
CREATE INDEX idx_silver_customers_segment ON meridian.silver_customers(segment_id);
CREATE INDEX idx_silver_loans_customer ON meridian.silver_loans(customer_id);
CREATE INDEX idx_silver_loans_status ON meridian.silver_loans(status);
CREATE INDEX idx_gold_branch_metrics_date ON meridian.gold_branch_metrics(date);
CREATE INDEX idx_pipeline_runs_pipeline ON meridian.pipeline_runs(pipeline_id);
CREATE INDEX idx_pipeline_runs_status ON meridian.pipeline_runs(status);

-- Enable RLS (permissive for demo)
ALTER TABLE meridian.bronze_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian.bronze_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian.silver_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian.silver_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian.gold_daily_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE meridian.gold_branch_metrics ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for demo)
CREATE POLICY "Allow all" ON meridian.bronze_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meridian.bronze_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meridian.silver_customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meridian.silver_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meridian.gold_daily_revenue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON meridian.gold_branch_metrics FOR ALL USING (true) WITH CHECK (true);
