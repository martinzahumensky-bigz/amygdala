-- ============================================
-- FEAT-020: DATA PRODUCTS
-- Group assets into logical data products
-- ============================================

-- Data Products table
CREATE TABLE amygdala.data_products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    business_purpose TEXT,

    -- Classification
    domain TEXT,  -- e.g., 'Finance', 'Marketing', 'Operations'
    type TEXT DEFAULT 'aggregate' CHECK (type IN ('source-aligned', 'aggregate', 'consumer-aligned')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated', 'retired')),

    -- Ownership
    owner TEXT,
    steward TEXT,

    -- Visual
    icon TEXT,  -- emoji or icon name
    color TEXT,  -- hex color for UI

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Lifecycle timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deprecated_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    created_by TEXT
);

-- Junction table for product-asset relationships
CREATE TABLE amygdala.data_product_assets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT REFERENCES amygdala.data_products(id) ON DELETE CASCADE,
    asset_id TEXT REFERENCES amygdala.assets(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('primary', 'supporting', 'derived', 'member')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by TEXT,
    UNIQUE(product_id, asset_id)
);

-- Indexes for performance
CREATE INDEX idx_data_products_domain ON amygdala.data_products(domain);
CREATE INDEX idx_data_products_status ON amygdala.data_products(status);
CREATE INDEX idx_data_products_name ON amygdala.data_products(name);
CREATE INDEX idx_data_product_assets_product ON amygdala.data_product_assets(product_id);
CREATE INDEX idx_data_product_assets_asset ON amygdala.data_product_assets(asset_id);

-- Enable RLS
ALTER TABLE amygdala.data_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.data_product_assets ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, can be restricted later)
CREATE POLICY "Allow all access to data_products" ON amygdala.data_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to data_product_assets" ON amygdala.data_product_assets FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_data_products_updated_at
    BEFORE UPDATE ON amygdala.data_products
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();
