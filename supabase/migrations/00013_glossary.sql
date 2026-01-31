-- ============================================
-- FEAT-024: BUSINESS GLOSSARY
-- Centralized glossary for business terms
-- Inspired by Atlan and Collibra best practices
-- ============================================

-- Glossary Domains (categories for organizing terms)
CREATE TABLE amygdala.glossary_domains (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT,  -- hex color for UI
    icon TEXT,   -- emoji or icon name
    parent_id TEXT REFERENCES amygdala.glossary_domains(id) ON DELETE SET NULL,
    owner TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Glossary Terms (the core business terms)
CREATE TABLE amygdala.glossary_terms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    definition TEXT NOT NULL,

    -- Classification
    domain_id TEXT REFERENCES amygdala.glossary_domains(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deprecated')),

    -- Ownership
    owner TEXT,
    steward TEXT,

    -- Relationships
    synonyms TEXT[] DEFAULT '{}',           -- alternative names
    related_terms TEXT[] DEFAULT '{}',      -- IDs of related terms

    -- Additional metadata
    examples TEXT,                          -- usage examples
    abbreviation TEXT,                      -- e.g., "ARR" for "Annual Recurring Revenue"
    source TEXT,                            -- where this term comes from
    metadata JSONB DEFAULT '{}',            -- extensible metadata

    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    created_by TEXT
);

-- Link terms to specific columns in assets
CREATE TABLE amygdala.glossary_term_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    term_id TEXT REFERENCES amygdala.glossary_terms(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    column_name TEXT,  -- NULL means linked at asset level, not column level
    confidence DECIMAL(3,2) DEFAULT 1.0,  -- 0-1 confidence score
    link_type TEXT DEFAULT 'manual' CHECK (link_type IN ('manual', 'auto', 'suggested')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    UNIQUE(term_id, asset_id, column_name)
);

-- Indexes for performance
CREATE INDEX idx_glossary_terms_name ON amygdala.glossary_terms(name);
CREATE INDEX idx_glossary_terms_domain ON amygdala.glossary_terms(domain_id);
CREATE INDEX idx_glossary_terms_status ON amygdala.glossary_terms(status);
CREATE INDEX idx_glossary_term_links_term ON amygdala.glossary_term_links(term_id);
CREATE INDEX idx_glossary_term_links_asset ON amygdala.glossary_term_links(asset_id);
CREATE INDEX idx_glossary_term_links_column ON amygdala.glossary_term_links(column_name);

-- Full text search on term name and definition
CREATE INDEX idx_glossary_terms_search ON amygdala.glossary_terms
    USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(definition, '')));

-- Enable RLS
ALTER TABLE amygdala.glossary_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.glossary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.glossary_term_links ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now)
CREATE POLICY "Allow all access to glossary_domains" ON amygdala.glossary_domains FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to glossary_terms" ON amygdala.glossary_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to glossary_term_links" ON amygdala.glossary_term_links FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_glossary_domains_updated_at
    BEFORE UPDATE ON amygdala.glossary_domains
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();

CREATE TRIGGER update_glossary_terms_updated_at
    BEFORE UPDATE ON amygdala.glossary_terms
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();

-- Seed default domains (common business categories)
INSERT INTO amygdala.glossary_domains (id, name, description, color, icon) VALUES
    ('domain-finance', 'Finance', 'Financial metrics, revenue, costs, and accounting terms', '#10b981', 'DollarSign'),
    ('domain-customer', 'Customer', 'Customer-related metrics and attributes', '#3b82f6', 'Users'),
    ('domain-product', 'Product', 'Product metrics, features, and catalog terms', '#8b5cf6', 'Package'),
    ('domain-operations', 'Operations', 'Operational metrics and process terms', '#f59e0b', 'Settings'),
    ('domain-marketing', 'Marketing', 'Marketing metrics, campaigns, and channel terms', '#ec4899', 'Megaphone'),
    ('domain-sales', 'Sales', 'Sales metrics, pipeline, and conversion terms', '#06b6d4', 'TrendingUp'),
    ('domain-hr', 'Human Resources', 'Employee, headcount, and workforce terms', '#a855f7', 'UserPlus'),
    ('domain-technology', 'Technology', 'Technical terms, systems, and infrastructure', '#6366f1', 'Cpu');

-- Seed example business terms
INSERT INTO amygdala.glossary_terms (id, name, definition, domain_id, status, abbreviation, examples) VALUES
    ('term-arr', 'Annual Recurring Revenue', 'The value of recurring revenue normalized to a one-year period. Calculated as Monthly Recurring Revenue (MRR) multiplied by 12.', 'domain-finance', 'approved', 'ARR', 'If MRR is $10,000, then ARR = $120,000'),
    ('term-mrr', 'Monthly Recurring Revenue', 'The predictable revenue a business expects to receive every month from active subscriptions.', 'domain-finance', 'approved', 'MRR', 'Sum of all active subscription fees billed monthly'),
    ('term-churn', 'Customer Churn Rate', 'The percentage of customers who stop using a product or service during a given time period.', 'domain-customer', 'approved', NULL, 'If 10 out of 100 customers cancel in a month, churn rate = 10%'),
    ('term-cac', 'Customer Acquisition Cost', 'The total cost of acquiring a new customer, including marketing and sales expenses.', 'domain-marketing', 'approved', 'CAC', 'Total marketing spend / Number of new customers acquired'),
    ('term-ltv', 'Customer Lifetime Value', 'The total revenue expected from a customer throughout their entire relationship with the business.', 'domain-customer', 'approved', 'LTV', 'Average revenue per customer * Average customer lifespan'),
    ('term-nps', 'Net Promoter Score', 'A measure of customer loyalty based on the likelihood of recommending the product to others.', 'domain-customer', 'approved', 'NPS', 'Score ranges from -100 to +100 based on survey responses'),
    ('term-aov', 'Average Order Value', 'The average amount spent each time a customer places an order.', 'domain-sales', 'approved', 'AOV', 'Total Revenue / Number of Orders'),
    ('term-cogs', 'Cost of Goods Sold', 'The direct costs attributable to the production of goods sold by a company.', 'domain-finance', 'approved', 'COGS', 'Raw materials + Direct labor + Manufacturing overhead'),
    ('term-gross-margin', 'Gross Margin', 'The difference between revenue and cost of goods sold, expressed as a percentage of revenue.', 'domain-finance', 'approved', NULL, '(Revenue - COGS) / Revenue * 100'),
    ('term-dau', 'Daily Active Users', 'The number of unique users who engage with a product on a given day.', 'domain-product', 'approved', 'DAU', 'Count of unique user IDs with at least one session per day');

-- Set related terms
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-mrr'] WHERE id = 'term-arr';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-arr'] WHERE id = 'term-mrr';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-ltv', 'term-cac'] WHERE id = 'term-churn';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-ltv'] WHERE id = 'term-cac';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-cac', 'term-churn'] WHERE id = 'term-ltv';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-aov'] WHERE id = 'term-sales';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-gross-margin'] WHERE id = 'term-cogs';
UPDATE amygdala.glossary_terms SET related_terms = ARRAY['term-cogs'] WHERE id = 'term-gross-margin';
