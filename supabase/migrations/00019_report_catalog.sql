-- ============================================
-- REPORT CATALOG ENHANCEMENT
-- ============================================
-- Adds fields to support application reports/screens
-- and seeds Meridian Bank reports

-- Add columns for application context
ALTER TABLE amygdala.assets
ADD COLUMN IF NOT EXISTS app_url TEXT,
ADD COLUMN IF NOT EXISTS application TEXT,
ADD COLUMN IF NOT EXISTS app_metadata JSONB DEFAULT '{}';

-- Create index for application lookups
CREATE INDEX IF NOT EXISTS idx_assets_application ON amygdala.assets(application);
CREATE INDEX IF NOT EXISTS idx_assets_app_url ON amygdala.assets(app_url);

-- Comment on new columns
COMMENT ON COLUMN amygdala.assets.app_url IS 'URL/route in the application (e.g., /reports/revenue)';
COMMENT ON COLUMN amygdala.assets.application IS 'Application name (e.g., meridian, platform)';
COMMENT ON COLUMN amygdala.assets.app_metadata IS 'Application-specific metadata (e.g., report config, refresh schedule)';

-- Seed Meridian Bank Reports
-- These are the consumer-facing reports that use the underlying data assets

INSERT INTO amygdala.assets (
    id, name, asset_type, layer, description, business_context,
    tags, owner, steward, upstream_assets, app_url, application,
    fitness_status, app_metadata, source_table
) VALUES
-- Revenue Report
(
    'report_meridian_revenue',
    'Meridian: Daily Revenue Report',
    'report',
    'consumer',
    'Executive dashboard showing daily revenue metrics, branch performance breakdown, and trend analysis. Used by finance and executive teams for daily business monitoring.',
    'Primary revenue tracking report for Meridian Bank. Displays total revenue, transaction counts, average transaction values, and per-branch breakdowns. Critical for daily financial monitoring.',
    ARRAY['finance', 'revenue', 'daily', 'executive', 'meridian'],
    'Finance Team',
    'Sarah Chen',
    ARRAY['gold_daily_revenue', 'gold_branch_metrics'],
    '/reports/revenue',
    'meridian',
    'green',
    '{"refresh_frequency": "daily", "business_hours": true, "alert_threshold": 0.2}',
    'meridian.gold_daily_revenue'
),
-- Branch Performance Report
(
    'report_meridian_branch_performance',
    'Meridian: Branch Performance Report',
    'report',
    'consumer',
    'Comprehensive branch performance dashboard comparing all branches across key metrics including revenue, transaction volume, customer satisfaction, and efficiency.',
    'Used by regional managers and branch directors to monitor and compare branch performance. Includes trending, rankings, and drill-down capabilities.',
    ARRAY['operations', 'branches', 'performance', 'comparison', 'meridian'],
    'Operations Team',
    'Mike Rodriguez',
    ARRAY['gold_branch_metrics', 'gold_daily_revenue'],
    '/reports/branch-performance',
    'meridian',
    'green',
    '{"refresh_frequency": "daily", "comparison_periods": ["daily", "weekly", "monthly"]}',
    'meridian.gold_branch_metrics'
),
-- Loan Portfolio Report
(
    'report_meridian_loan_portfolio',
    'Meridian: Loan Portfolio Report',
    'report',
    'consumer',
    'Loan portfolio analysis showing outstanding loans, risk distribution, payment status, and delinquency rates across all loan products.',
    'Risk management report for monitoring loan health. Used by credit risk team and executive leadership for portfolio oversight.',
    ARRAY['lending', 'risk', 'portfolio', 'credit', 'meridian'],
    'Risk Management',
    'Jennifer Park',
    ARRAY['gold_loan_portfolio', 'silver_loans'],
    '/reports/loan-portfolio',
    'meridian',
    'amber',
    '{"refresh_frequency": "daily", "risk_model_version": "2.1"}',
    'meridian.gold_loan_portfolio'
),
-- Customer 360 View
(
    'report_meridian_customer_360',
    'Meridian: Customer 360 View',
    'application_screen',
    'consumer',
    'Unified customer profile view showing all accounts, transactions, interactions, and relationship history for a single customer.',
    'CRM application screen for customer service representatives and relationship managers. Provides complete view of customer relationship.',
    ARRAY['crm', 'customer', 'profile', '360', 'meridian'],
    'Customer Experience',
    'David Kim',
    ARRAY['silver_customers', 'silver_accounts', 'silver_transactions'],
    '/crm/customer-360',
    'meridian',
    'green',
    '{"real_time": true, "includes_pii": true}',
    'meridian.silver_customers'
),
-- Call Center Dashboard
(
    'report_meridian_call_center',
    'Meridian: Call Center Dashboard',
    'dashboard',
    'consumer',
    'Real-time call center monitoring dashboard showing queue status, agent availability, call volumes, and service level metrics.',
    'Operations dashboard for call center supervisors. Monitors real-time service levels and agent performance.',
    ARRAY['operations', 'call-center', 'real-time', 'service', 'meridian'],
    'Customer Service',
    'Maria Garcia',
    ARRAY['silver_interactions', 'silver_customers'],
    '/crm/call-center',
    'meridian',
    'green',
    '{"real_time": true, "refresh_seconds": 30}',
    'meridian.silver_interactions'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    business_context = EXCLUDED.business_context,
    tags = EXCLUDED.tags,
    upstream_assets = EXCLUDED.upstream_assets,
    app_url = EXCLUDED.app_url,
    application = EXCLUDED.application,
    app_metadata = EXCLUDED.app_metadata,
    updated_at = NOW();

-- Create lineage relationships between reports and their source data
-- Only create lineage where the source asset actually exists
INSERT INTO amygdala.lineage (source_asset_id, target_asset_id, transformation_type, confidence)
SELECT
    upstream.source_asset_id,
    upstream.target_asset_id,
    'aggregation' as transformation_type,
    1.0 as confidence
FROM (
    SELECT
        unnest(a.upstream_assets) as source_asset_id,
        a.id as target_asset_id
    FROM amygdala.assets a
    WHERE a.application = 'meridian'
      AND a.asset_type IN ('report', 'dashboard', 'application_screen')
      AND array_length(a.upstream_assets, 1) > 0
) upstream
WHERE EXISTS (SELECT 1 FROM amygdala.assets src WHERE src.id = upstream.source_asset_id)
ON CONFLICT (source_asset_id, target_asset_id) DO NOTHING;
