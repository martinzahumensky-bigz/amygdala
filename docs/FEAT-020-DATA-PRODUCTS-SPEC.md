# FEAT-020: Data Products Specification

**GitHub Issue:** #6
**Status:** In Progress
**Author:** Claude Code
**Date:** 2026-01-29

---

## Executive Summary

Data Products enable users to group related data assets into logical collections with ownership, lifecycle management, and quality contracts. This follows data mesh best practices from industry leaders like Atlan and Collibra.

## Research Findings

### Industry Best Practices (Atlan/Collibra)

| Feature | Atlan | Collibra | Our Implementation |
|---------|-------|----------|-------------------|
| Data Product as Entity | Yes | Yes | Yes - `data_products` table |
| Asset Linking | Many-to-many | Many-to-many | Junction table `data_product_assets` |
| Lifecycle | Draft/Active/Deprecated | Draft/Certified/Deprecated | draft/published/deprecated/retired |
| Ownership | Owner + Steward | Multiple roles | Owner + Steward |
| Domains | Business domains | Communities | Domain field + tags |
| Quality | SLA-based | Quality scores | Quality thresholds |
| Contracts | Data contracts | Specifications | SLA + schema definition |

### Data Mesh Principles Applied

1. **Domain Ownership** - Each product belongs to a domain (Finance, Marketing, etc.)
2. **Product Thinking** - Assets packaged with ownership, quality, and contracts
3. **Self-serve Platform** - Users can discover and subscribe to products
4. **Federated Governance** - Global standards with domain autonomy

---

## Database Schema

### New Tables

```sql
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

-- Indexes
CREATE INDEX idx_data_products_domain ON amygdala.data_products(domain);
CREATE INDEX idx_data_products_status ON amygdala.data_products(status);
CREATE INDEX idx_data_product_assets_product ON amygdala.data_product_assets(product_id);
CREATE INDEX idx_data_product_assets_asset ON amygdala.data_product_assets(asset_id);

-- RLS
ALTER TABLE amygdala.data_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE amygdala.data_product_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to data_products" ON amygdala.data_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to data_product_assets" ON amygdala.data_product_assets FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_data_products_updated_at
    BEFORE UPDATE ON amygdala.data_products
    FOR EACH ROW
    EXECUTE FUNCTION amygdala.update_updated_at();
```

---

## API Routes

### `/api/products` (GET, POST)

**GET** - List all data products
```typescript
// Query params
{
  search?: string;      // Search by name/description
  domain?: string;      // Filter by domain
  status?: string;      // Filter by status
  limit?: number;       // Pagination
  offset?: number;
}

// Response
{
  products: DataProduct[];
  total: number;
  domainCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}
```

**POST** - Create a data product
```typescript
// Request body
{
  name: string;
  description?: string;
  business_purpose?: string;
  domain?: string;
  type?: 'source-aligned' | 'aggregate' | 'consumer-aligned';
  owner?: string;
  steward?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  asset_ids?: string[];  // Initial assets to add
}
```

### `/api/products/[productId]` (GET, PUT, DELETE)

**GET** - Get product with assets
```typescript
// Response
{
  product: DataProduct;
  assets: Asset[];
  assetCount: number;
  qualityScore: number;  // Average of asset quality scores
  healthSummary: { green: number; amber: number; red: number };
}
```

**PUT** - Update product
**DELETE** - Delete product (soft delete via status='retired')

### `/api/products/[productId]/assets` (POST, DELETE)

**POST** - Add assets to product
```typescript
// Request body
{
  asset_ids: string[];
  role?: 'primary' | 'supporting' | 'derived' | 'member';
}
```

**DELETE** - Remove assets from product
```typescript
// Request body
{
  asset_ids: string[];
}
```

---

## UI Components

### 1. Data Products Listing Page
**Path:** `/dashboard/catalog/products`

**Features:**
- Grid/List view toggle
- Summary cards: Total products, by status, by domain
- Search and filter controls
- Product cards showing:
  - Icon and name
  - Domain badge
  - Status badge
  - Asset count
  - Quality score (aggregated)
  - Owner avatar
- Create Product button → opens modal

### 2. Create/Edit Product Modal

**Fields:**
- Name (required)
- Description (textarea)
- Business Purpose (textarea)
- Domain (dropdown: Finance, Marketing, Operations, HR, Technology, Custom)
- Type (dropdown: source-aligned, aggregate, consumer-aligned)
- Owner (user selector)
- Steward (user selector)
- Icon (emoji picker)
- Color (color picker)
- Tags (multi-select)

### 3. Product Detail Page
**Path:** `/dashboard/catalog/products/[productId]`

**Tabs:**
1. **Overview** - Product metadata, ownership, lifecycle status
2. **Assets** - Grid of linked assets with add/remove functionality
3. **Quality** - Aggregated quality metrics from all assets
4. **Lineage** - Combined lineage view of all assets
5. **Activity** - Recent changes and activity log

### 4. Asset Selection Drawer

When adding assets to a product:
- Slide-out drawer from right
- Search/filter assets
- Multi-select with checkboxes
- Preview of selected assets
- Confirm button to add

---

## Implementation Checklist

### Phase 1: Database & API
- [ ] Create migration file `00010_data_products.sql`
- [ ] Push migration to Supabase
- [ ] Create `/api/products` route (GET, POST)
- [ ] Create `/api/products/[productId]` route (GET, PUT, DELETE)
- [ ] Create `/api/products/[productId]/assets` route (POST, DELETE)
- [ ] Update types.generated.ts

### Phase 2: UI - Listing Page
- [ ] Create `/dashboard/catalog/products/page.tsx`
- [ ] Create ProductCard component
- [ ] Create CreateProductModal component
- [ ] Add summary cards
- [ ] Add search and filters
- [ ] Add grid/list view toggle

### Phase 3: UI - Detail Page
- [ ] Create `/dashboard/catalog/products/[productId]/page.tsx`
- [ ] Create Overview tab
- [ ] Create Assets tab with add/remove
- [ ] Create Quality tab
- [ ] Create asset selection drawer

### Phase 4: Navigation & Polish
- [ ] Update Sidebar.tsx with Data Products link
- [ ] Add product indicator on asset cards
- [ ] Add "Add to Product" action in catalog
- [ ] Create seed data for demo products

---

## Domain Values

Standard domains for the platform:
- Finance
- Marketing
- Operations
- HR
- Technology
- Sales
- Customer Success
- Legal
- Risk & Compliance
- Custom

---

## Status Lifecycle

```
┌──────────┐    publish    ┌───────────┐    deprecate    ┌────────────┐    retire    ┌─────────┐
│  DRAFT   │ ─────────────>│ PUBLISHED │ ───────────────>│ DEPRECATED │ ───────────>│ RETIRED │
└──────────┘               └───────────┘                 └────────────┘             └─────────┘
     │                           │                              │
     └───────────────────────────┴──────────────────────────────┘
                        (can revert to draft)
```

**Transition Rules:**
- **draft → published**: Requires at least 1 asset, owner assigned
- **published → deprecated**: Adds deprecation notice, alerts consumers
- **deprecated → retired**: Removes from active listings
- **Any → draft**: Resets lifecycle, removes publish/deprecate dates

---

## Color Palette for Products

Default colors for domain-based styling:
```typescript
const domainColors = {
  'Finance': '#22c55e',      // Green
  'Marketing': '#ec4899',    // Pink
  'Operations': '#f59e0b',   // Amber
  'HR': '#8b5cf6',           // Purple
  'Technology': '#06b6d4',   // Cyan
  'Sales': '#3b82f6',        // Blue
  'Customer Success': '#10b981', // Emerald
  'Legal': '#64748b',        // Slate
  'Risk & Compliance': '#ef4444', // Red
};
```

---

## Future Enhancements (Out of Scope)

- Data contracts with schema validation
- Consumer subscription management
- Quality SLA alerts
- Version history for products
- Product comparison view
- Export product catalog
