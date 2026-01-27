# FEAT-012: Ataccama Salesforce Data Integration
## Enterprise CRM Data for Amygdala Demo

> **Status:** Draft
> **Version:** 1.0
> **Last Updated:** 2026-01-27

---

## Executive Summary

This specification outlines the integration of Salesforce-style CRM data into the Meridian Bank simulation environment. By adding realistic enterprise CRM data patterns—with their inherent quality challenges—we demonstrate how Amygdala handles the messy reality of enterprise data ecosystems.

Salesforce data is ideal for this demo because:
1. **Universal recognition** - Everyone knows what CRM data looks like
2. **Known quality issues** - Duplicate accounts, stale contacts, incomplete records are universal
3. **High business value** - CRM data quality directly impacts revenue
4. **Complex relationships** - Account → Contact → Opportunity lineage is well understood

---

## Data Model

### Core CRM Objects

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SALESFORCE-STYLE DATA MODEL                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   ACCOUNTS   │────────▶│   CONTACTS   │         │    LEADS     │       │
│   │              │         │              │         │              │       │
│   │ - Company    │         │ - First Name │         │ - Name       │       │
│   │ - Industry   │         │ - Last Name  │         │ - Company    │       │
│   │ - Revenue    │         │ - Email      │         │ - Status     │       │
│   │ - Employees  │         │ - Phone      │         │ - Source     │       │
│   │ - Owner      │         │ - Title      │         │ - Rating     │       │
│   └──────┬───────┘         └──────────────┘         └──────────────┘       │
│          │                                                                   │
│          │                                                                   │
│          ▼                                                                   │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │OPPORTUNITIES │────────▶│   PRODUCTS   │         │  ACTIVITIES  │       │
│   │              │         │              │         │              │       │
│   │ - Name       │         │ - Name       │         │ - Type       │       │
│   │ - Stage      │         │ - Category   │         │ - Subject    │       │
│   │ - Amount     │         │ - Price      │         │ - Due Date   │       │
│   │ - Close Date │         │              │         │ - Status     │       │
│   │ - Probability│         │              │         │              │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Salesforce Tables in Meridian Schema

```sql
-- Accounts (Companies/Organizations)
CREATE TABLE meridian.sf_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_name TEXT NOT NULL,
    account_type TEXT,  -- 'Customer', 'Prospect', 'Partner', 'Competitor'
    industry TEXT,
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    website TEXT,
    phone TEXT,
    billing_street TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,
    owner_id TEXT,
    owner_name TEXT,
    parent_account_id TEXT,
    rating TEXT,  -- 'Hot', 'Warm', 'Cold'
    description TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ DEFAULT NOW(),
    last_activity_date DATE,
    -- Data quality fields added by Amygdala
    is_duplicate_suspect BOOLEAN DEFAULT FALSE,
    data_quality_score DECIMAL(5,2)
);

-- Contacts (People at Accounts)
CREATE TABLE meridian.sf_contacts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT REFERENCES meridian.sf_accounts(id),
    first_name TEXT,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || last_name) STORED,
    title TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    mobile_phone TEXT,
    mailing_street TEXT,
    mailing_city TEXT,
    mailing_state TEXT,
    mailing_postal_code TEXT,
    mailing_country TEXT,
    owner_id TEXT,
    owner_name TEXT,
    lead_source TEXT,
    birthdate DATE,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ DEFAULT NOW(),
    last_activity_date DATE,
    -- Quality indicators
    email_valid BOOLEAN,
    phone_valid BOOLEAN,
    is_stale BOOLEAN DEFAULT FALSE,  -- No activity > 180 days
    has_bounced_email BOOLEAN DEFAULT FALSE
);

-- Opportunities (Sales Deals)
CREATE TABLE meridian.sf_opportunities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT REFERENCES meridian.sf_accounts(id),
    contact_id TEXT REFERENCES meridian.sf_contacts(id),
    opportunity_name TEXT NOT NULL,
    stage_name TEXT NOT NULL,  -- See stages below
    amount DECIMAL(15,2),
    probability INTEGER,  -- 0-100
    expected_revenue DECIMAL(15,2) GENERATED ALWAYS AS (amount * probability / 100) STORED,
    close_date DATE,
    is_closed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN,
    lead_source TEXT,
    campaign_id TEXT,
    forecast_category TEXT,  -- 'Pipeline', 'Best Case', 'Commit', 'Closed'
    next_step TEXT,
    description TEXT,
    owner_id TEXT,
    owner_name TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ DEFAULT NOW(),
    -- Quality indicators
    is_stale_opportunity BOOLEAN DEFAULT FALSE,  -- No activity > 30 days
    missing_contact BOOLEAN DEFAULT FALSE,
    past_close_date BOOLEAN DEFAULT FALSE
);

-- Leads (Potential Customers)
CREATE TABLE meridian.sf_leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    first_name TEXT,
    last_name TEXT NOT NULL,
    full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || last_name) STORED,
    company TEXT,
    title TEXT,
    email TEXT,
    phone TEXT,
    mobile_phone TEXT,
    website TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    lead_source TEXT,
    status TEXT NOT NULL,  -- 'New', 'Working', 'Qualified', 'Converted', 'Unqualified'
    rating TEXT,  -- 'Hot', 'Warm', 'Cold'
    industry TEXT,
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    owner_id TEXT,
    owner_name TEXT,
    converted_date DATE,
    converted_account_id TEXT,
    converted_contact_id TEXT,
    converted_opportunity_id TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    last_modified_date TIMESTAMPTZ DEFAULT NOW(),
    -- Quality indicators
    email_valid BOOLEAN,
    phone_valid BOOLEAN,
    is_duplicate_suspect BOOLEAN DEFAULT FALSE
);

-- Activities (Tasks, Calls, Meetings)
CREATE TABLE meridian.sf_activities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    related_to_type TEXT,  -- 'Account', 'Contact', 'Opportunity', 'Lead'
    related_to_id TEXT,
    activity_type TEXT NOT NULL,  -- 'Task', 'Call', 'Meeting', 'Email'
    subject TEXT NOT NULL,
    description TEXT,
    activity_date DATE,
    due_date DATE,
    status TEXT,  -- 'Open', 'Completed', 'Cancelled'
    priority TEXT,  -- 'High', 'Normal', 'Low'
    owner_id TEXT,
    owner_name TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    completed_date TIMESTAMPTZ
);

-- Reference: Opportunity Stages
CREATE TABLE meridian.ref_opportunity_stages (
    stage_name TEXT PRIMARY KEY,
    stage_order INTEGER,
    probability INTEGER,
    is_closed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN,
    forecast_category TEXT
);

INSERT INTO meridian.ref_opportunity_stages VALUES
    ('Prospecting', 1, 10, FALSE, NULL, 'Pipeline'),
    ('Qualification', 2, 20, FALSE, NULL, 'Pipeline'),
    ('Needs Analysis', 3, 40, FALSE, NULL, 'Pipeline'),
    ('Value Proposition', 4, 60, FALSE, NULL, 'Best Case'),
    ('Negotiation', 5, 80, FALSE, NULL, 'Commit'),
    ('Closed Won', 6, 100, TRUE, TRUE, 'Closed'),
    ('Closed Lost', 7, 0, TRUE, FALSE, 'Closed');
```

---

## Data Quality Issues to Inject

### 1. Duplicate Accounts (8-12%)

**Scenario:** Multiple records for same company with slight name variations.

```
Account 1: "Acme Corporation"
Account 2: "Acme Corp"
Account 3: "ACME Corp."
Account 4: "Acme Corporation Inc"
```

**What Amygdala should detect:**
- Similar company names (fuzzy matching)
- Same website domain
- Same phone number across accounts
- Similar addresses

**Quality Agent Rule:**
```sql
-- Flag potential duplicates based on domain
SELECT a1.id, a2.id, a1.account_name, a2.account_name
FROM sf_accounts a1
JOIN sf_accounts a2 ON
    a1.id < a2.id AND
    SUBSTRING(a1.website FROM '://([^/]+)') = SUBSTRING(a2.website FROM '://([^/]+)')
```

---

### 2. Stale Contacts (15-20%)

**Scenario:** Contacts with no activity for 180+ days.

**What Amygdala should detect:**
- Last activity date > 6 months ago
- No recent opportunities
- Email bounces not recorded
- Likely job changers

**Quality Agent Rule:**
```sql
SELECT * FROM sf_contacts
WHERE last_activity_date < CURRENT_DATE - INTERVAL '180 days'
   OR last_activity_date IS NULL
```

---

### 3. Incomplete Opportunities (10-15%)

**Scenario:** Opportunities missing key fields.

- Missing close date
- Missing amount
- No contact associated
- No next step defined
- Past close date but still "open"

**Quality Agent Rules:**
```sql
-- Missing critical fields
SELECT * FROM sf_opportunities
WHERE amount IS NULL OR close_date IS NULL;

-- Past due opportunities still open
SELECT * FROM sf_opportunities
WHERE close_date < CURRENT_DATE AND is_closed = FALSE;

-- Opportunities without contacts
SELECT * FROM sf_opportunities
WHERE contact_id IS NULL;
```

---

### 4. Invalid Contact Data (12-18%)

**Scenario:** Email and phone validation failures.

- Invalid email formats
- Bounced emails
- Invalid phone formats
- Generic emails (info@, sales@)

```python
# Generate contacts with quality issues
def generate_contact():
    # 12% invalid emails
    if random.random() < 0.12:
        email = random.choice([
            "not-an-email",
            "missing@domain",
            "@nodomain.com",
            ""
        ])

    # 5% generic emails
    elif random.random() < 0.05:
        email = random.choice([
            f"info@{fake.domain_name()}",
            f"sales@{fake.domain_name()}",
            f"contact@{fake.domain_name()}"
        ])
```

---

### 5. Orphaned Records (3-5%)

**Scenario:** Contacts/Opportunities referencing deleted accounts.

**What Amygdala should detect:**
- Contact with NULL account_id
- Contact with account_id pointing to non-existent account
- Opportunities with no valid account

---

### 6. Pipeline Integrity Issues

**Scenario:** Business logic violations in sales pipeline.

- Stage doesn't match probability
- Closed Won with $0 amount
- Multiple primary contacts
- Owner assignment gaps

---

## CRM Reports & Dashboards

### Sales Pipeline Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MERIDIAN BANK - Sales Pipeline                               Q4 2025      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │   $12.4M     │ │   $3.2M      │ │   $8.1M      │ │    68%       │       │
│  │   Pipeline   │ │   Commit     │ │   Best Case  │ │   Win Rate   │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                              │
│  Pipeline by Stage                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Prospecting     ████████████████░░░░░░░░░░░░░░░░░░░░░░ $4.2M (42 opps)││
│  │ Qualification   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $2.1M (28 opps)││
│  │ Needs Analysis  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $1.8M (15 opps)││
│  │ Value Prop      ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░ $2.8M (12 opps)││
│  │ Negotiation     ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $1.5M (8 opps) ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ⚠️ DATA QUALITY ALERTS                                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ • 15 opportunities past close date still open ($2.1M at risk)          ││
│  │ • 8 opportunities missing contact assignment                           ││
│  │ • 23 stale opportunities (no activity > 30 days)                       ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Account Health Report

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Account Data Quality Report                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Overall Data Quality Score: 72% ████████████████░░░░░░░░░░░░░░            │
│                                                                              │
│  ┌─ Quality Metrics ──────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  Completeness      85%  ████████████████████░░░░░                      ││
│  │  Uniqueness        88%  █████████████████████░░░░                      ││
│  │  Validity          78%  ██████████████████░░░░░░░                      ││
│  │  Freshness         62%  ███████████████░░░░░░░░░░░                      ││
│  │  Consistency       71%  █████████████████░░░░░░░░                      ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─ Top Issues ────────────────────────────────────────────────────────────┐│
│  │                                                                          ││
│  │  1. Duplicate Accounts           127 records (8.4%)     🔴 High        ││
│  │  2. Stale Contacts               312 records (18.2%)    🟡 Medium      ││
│  │  3. Invalid Emails               89 records (5.2%)      🟡 Medium      ││
│  │  4. Missing Phone Numbers        156 records (9.1%)     🟢 Low         ││
│  │  5. No Owner Assigned            23 records (1.5%)      🟢 Low         ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration with Amygdala

### Asset Catalog Entries

The Documentarist agent will catalog these Salesforce assets:

| Asset Name | Type | Layer | Trust Factors |
|------------|------|-------|---------------|
| `sf_accounts` | Table | Silver | Duplicate detection, completeness, ownership |
| `sf_contacts` | Table | Silver | Email validity, phone validity, freshness |
| `sf_opportunities` | Table | Silver | Stage integrity, close date validity |
| `sf_leads` | Table | Silver | Conversion rates, duplicate detection |
| `Sales Pipeline Dashboard` | Report | Consumer | Depends on all above |
| `Account Health Report` | Report | Consumer | Quality metrics aggregation |

### Spotter Monitoring Rules

```yaml
spotter_rules:
  - name: stale_opportunity_check
    asset: sf_opportunities
    condition: "opportunities with no activity > 30 days"
    severity: medium
    threshold: 10%  # Alert if > 10% of pipeline is stale

  - name: past_close_date_check
    asset: sf_opportunities
    condition: "open opportunities past close date"
    severity: high
    threshold: 5%

  - name: duplicate_account_check
    asset: sf_accounts
    condition: "accounts with duplicate indicators"
    severity: high
    threshold: 5%

  - name: contact_freshness_check
    asset: sf_contacts
    condition: "contacts with no activity > 180 days"
    severity: medium
    threshold: 15%
```

### Quality Agent Rules

```yaml
quality_rules:
  # Account rules
  - name: account_has_owner
    asset: sf_accounts
    expression: "owner_id IS NOT NULL"
    severity: medium

  - name: account_has_industry
    asset: sf_accounts
    expression: "industry IS NOT NULL"
    severity: low

  # Contact rules
  - name: contact_valid_email
    asset: sf_contacts
    expression: "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
    severity: medium

  - name: contact_not_generic_email
    asset: sf_contacts
    expression: "email NOT LIKE 'info@%' AND email NOT LIKE 'sales@%'"
    severity: low

  # Opportunity rules
  - name: opportunity_has_amount
    asset: sf_opportunities
    expression: "amount IS NOT NULL AND amount > 0"
    severity: high

  - name: opportunity_probability_matches_stage
    asset: sf_opportunities
    expression: "probability = (SELECT probability FROM ref_opportunity_stages WHERE stage_name = sf_opportunities.stage_name)"
    severity: medium
```

---

## Data Generation

### Generator Configuration

```python
SALESFORCE_CONFIG = {
    'accounts': {
        'count': 500,
        'duplicate_rate': 0.08,  # 8% duplicates
        'missing_owner_rate': 0.015,
        'industries': ['Banking', 'Insurance', 'Healthcare', 'Technology', 'Manufacturing', 'Retail'],
    },
    'contacts': {
        'per_account': (1, 5),  # 1-5 contacts per account
        'invalid_email_rate': 0.12,
        'invalid_phone_rate': 0.15,
        'stale_rate': 0.18,  # No activity > 180 days
        'bounced_email_rate': 0.05,
    },
    'opportunities': {
        'per_account': (0, 3),  # 0-3 opportunities per account
        'missing_amount_rate': 0.08,
        'missing_contact_rate': 0.10,
        'past_close_date_rate': 0.12,
        'stale_rate': 0.15,
    },
    'leads': {
        'count': 1000,
        'duplicate_rate': 0.05,
        'conversion_rate': 0.25,
    }
}
```

### Duplicate Generator

```python
def generate_duplicate_accounts(accounts: list, duplicate_rate: float):
    """Generate account duplicates with name variations."""
    duplicates = []
    num_to_duplicate = int(len(accounts) * duplicate_rate)

    for account in random.sample(accounts, num_to_duplicate):
        # Create variation
        variation = {
            **account,
            'id': generate_uuid(),
            'account_name': vary_company_name(account['account_name']),
            'is_duplicate_suspect': True,
        }
        duplicates.append(variation)

    return duplicates

def vary_company_name(name: str) -> str:
    """Create realistic name variations."""
    variations = [
        lambda n: n.replace(' Corporation', ' Corp'),
        lambda n: n.replace(' Corp', ' Corporation'),
        lambda n: n.replace(' Inc', ''),
        lambda n: n + ' Inc',
        lambda n: n.replace(' LLC', ''),
        lambda n: n.upper(),
        lambda n: n.title(),
        lambda n: re.sub(r'\s+', ' ', n),  # Extra spaces
    ]
    return random.choice(variations)(name)
```

---

## Cross-System Lineage

### Salesforce → Meridian Data Flow

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    CROSS-SYSTEM DATA LINEAGE                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  SALESFORCE (CRM)                    MERIDIAN (Data Warehouse)            │
│                                                                            │
│  ┌──────────────┐                    ┌──────────────┐                     │
│  │ sf_accounts  │──── Extract ──────▶│bronze_crm_   │                     │
│  │              │     (Daily)        │accounts      │                     │
│  └──────────────┘                    └──────┬───────┘                     │
│                                             │                              │
│  ┌──────────────┐                           │ Transform                    │
│  │ sf_contacts  │──── Extract ──────▶       │ + Cleanse                    │
│  │              │                           │                              │
│  └──────────────┘                    ┌──────▼───────┐                     │
│                                      │silver_       │                     │
│  ┌──────────────┐                    │customer_360  │                     │
│  │ sf_opps      │──── Extract ──────▶│              │                     │
│  │              │                    └──────┬───────┘                     │
│  └──────────────┘                           │                              │
│                                             │ Aggregate                    │
│                                             │                              │
│                                      ┌──────▼───────┐                     │
│                                      │gold_customer │                     │
│                                      │_360          │                     │
│                                      └──────────────┘                     │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

### Lineage Tracking

```sql
-- Cross-system lineage entries
INSERT INTO amygdala.lineage (source_asset_id, target_asset_id, transformation_type, transformation_logic)
VALUES
  ('sf_accounts', 'bronze_crm_accounts', 'extract', 'Daily Salesforce API extract at 01:00 UTC'),
  ('sf_contacts', 'bronze_crm_contacts', 'extract', 'Daily Salesforce API extract at 01:00 UTC'),
  ('bronze_crm_accounts', 'silver_customer_360', 'transform', 'Join accounts with contacts, validate emails, deduplicate'),
  ('bronze_crm_contacts', 'silver_customer_360', 'transform', 'Join with accounts, normalize phone numbers'),
  ('silver_customer_360', 'gold_customer_360', 'aggregate', 'Add lifetime value calculations, risk scores');
```

---

## Implementation Plan

### Phase 1: Schema & Data Generation (Week 1)

- [ ] Create Salesforce tables in Meridian schema
- [ ] Build data generation scripts
- [ ] Generate initial dataset with quality issues
- [ ] Seed reference data (stages, owners)

### Phase 2: Amygdala Integration (Week 1-2)

- [ ] Register assets in Amygdala catalog
- [ ] Configure Spotter monitoring rules
- [ ] Define Quality Agent rules
- [ ] Set up cross-system lineage

### Phase 3: Reports & Dashboards (Week 2)

- [ ] Build Sales Pipeline Dashboard
- [ ] Build Account Health Report
- [ ] Add data quality indicators
- [ ] Create CRM-specific views in Meridian app

### Phase 4: Demo Scenarios (Week 2-3)

- [ ] Script duplicate account detection demo
- [ ] Script stale contact cleanup demo
- [ ] Script pipeline integrity demo
- [ ] Create reset/inject functions

---

## Demo Scenarios

### Demo 1: Duplicate Account Detection

1. Show Sales Pipeline Dashboard
2. Note inflated pipeline numbers
3. Run Spotter on sf_accounts
4. Spotter detects 127 duplicate suspects
5. Creates issue with duplicate pairs
6. Show Transformation Agent offering merge

### Demo 2: Stale Contact Cleanup

1. Show Contact list with freshness indicators
2. Quality Agent flags 312 stale contacts
3. Show impact analysis (affects X opportunities)
4. Demonstrate bulk update workflow
5. Trust score improves after cleanup

### Demo 3: Pipeline Integrity

1. Show opportunities past close date
2. Spotter creates issue for each
3. Debugger traces to owner assignment
4. Auto-assign or escalate to manager
5. Pipeline report clears warnings

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Duplicate detection accuracy | > 90% |
| Stale contact identification | > 95% |
| Quality rule coverage | 100% of CRM fields |
| Report data quality visibility | Every report shows quality indicators |

---

*This specification extends Meridian Bank with enterprise CRM data patterns, enabling Amygdala to demonstrate real-world data trust challenges.*
