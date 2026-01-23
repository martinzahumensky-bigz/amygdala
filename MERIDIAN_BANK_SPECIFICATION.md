# Meridian Bank - Simulated Data Environment

## Overview

**Meridian Bank** is a fictional regional financial institution that serves as the demonstration environment for Amygdala. It provides a realistic data ecosystem with intentionally injected data quality issues that Amygdala agents can detect, debug, and resolve.

> This is NOT a real bank. It's a simulation environment designed to showcase Amygdala's capabilities in a relatable context.

---

## Purpose

1. **Demonstrate Amygdala's Value** - Show how agents detect issues that would make users say "I don't trust this data"
2. **Realistic Scenarios** - Financial data is universally understood and has clear quality expectations
3. **Controlled Issues** - Inject known problems that agents can discover
4. **End-to-End Testing** - Validate the entire Amygdala platform with realistic data flows

---

## Architecture

### Data Warehouse Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONSUMER LAYER                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Revenue   │ │   Branch    │ │   Loan      │ │   Risk      │   │
│  │   Report    │ │ Performance │ │ Portfolio   │ │  Dashboard  │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
├─────────┼───────────────┼───────────────┼───────────────┼───────────┤
│         │               │               │               │           │
│         ▼               ▼               ▼               ▼           │
│                        GOLD LAYER                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  agg_daily  │ │ agg_branch  │ │ agg_loan    │ │ agg_risk    │   │
│  │  _revenue   │ │ _metrics    │ │ _summary    │ │ _exposure   │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
├─────────┼───────────────┼───────────────┼───────────────┼───────────┤
│         │               │               │               │           │
│         ▼               ▼               ▼               ▼           │
│                       SILVER LAYER                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  clean_     │ │  clean_     │ │  clean_     │ │  clean_     │   │
│  │ transactions│ │  customers  │ │  loans      │ │  accounts   │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
├─────────┼───────────────┼───────────────┼───────────────┼───────────┤
│         │               │               │               │           │
│         ▼               ▼               ▼               ▼           │
│                       BRONZE LAYER                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  raw_       │ │  raw_       │ │  raw_       │ │  raw_       │   │
│  │ transactions│ │  customers  │ │  loans      │ │  accounts   │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │
├─────────┼───────────────┼───────────────┼───────────────┼───────────┤
│         │               │               │               │           │
│         ▼               ▼               ▼               ▼           │
│                     LANDING ZONE                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ core_bank_  │ │   crm_      │ │  loan_mgmt_ │ │ accounts_   │   │
│  │  extract    │ │  extract    │ │   extract   │ │  extract    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│        ▲               ▲               ▲               ▲           │
│        │               │               │               │           │
│   [Core Banking]   [CRM System]  [Loan System]  [Account Mgmt]     │
│                    SOURCE SYSTEMS                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Consumer-Facing Applications

### 1. Reports

#### Daily Revenue Report
**Purpose**: Executive summary of daily banking revenue
**Key Metrics**:
- Total revenue (interest income, fees, commissions)
- Revenue by branch
- Revenue vs. target
- Day-over-day change

**What Spotter should detect**:
- Missing yesterday's data
- Revenue spike/drop > 30%
- Missing branches in breakdown

---

#### Branch Performance Report
**Purpose**: Compare branch-level performance
**Key Metrics**:
- Transactions per branch
- Average transaction value
- Customer satisfaction scores
- Employee productivity

**What Spotter should detect**:
- Missing branches (reference data gap)
- Unusual transaction volumes
- Data freshness issues

---

#### Loan Portfolio Report
**Purpose**: Overview of loan book health
**Key Metrics**:
- Total loans outstanding
- Loans by product type
- NPL (Non-Performing Loans) ratio
- Collateral coverage

**What Spotter should detect**:
- Loan amounts exceeding collateral (business rule violation)
- Unusual NPL movements
- Missing product categories

---

#### Risk Exposure Dashboard
**Purpose**: Real-time risk monitoring
**Key Metrics**:
- Credit risk exposure
- Concentration by sector/geography
- Regulatory ratios

**What Spotter should detect**:
- Threshold breaches
- Data staleness (risk data must be fresh)

---

### 2. Applications

#### CRM - Customer 360 View
**Purpose**: Complete customer profile for relationship managers
**Features**:
- Customer demographics
- Account summary
- Transaction history
- Product holdings
- Contact history

**What agents should detect**:
- Invalid phone numbers (can't call customer)
- Invalid emails (can't reach customer)
- Missing mandatory fields
- Duplicate customers

---

#### Call Center Console
**Purpose**: Customer service agent interface
**Features**:
- Customer lookup (by account, phone, email)
- Recent interactions
- Open cases
- Product information

**What agents should detect**:
- Phone format issues (can't validate caller)
- Missing customer segments
- Data quality affecting search

---

## Database Schema

### Reference Data Tables

```sql
-- Branch reference (intentionally incomplete for demo)
CREATE TABLE ref_branches (
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

-- Product reference
CREATE TABLE ref_products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    interest_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer segments
CREATE TABLE ref_customer_segments (
    segment_id TEXT PRIMARY KEY,
    segment_name TEXT NOT NULL,
    description TEXT,
    priority INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Landing Zone (Raw Files Simulation)

```sql
-- Simulates CSV file landing from core banking
CREATE TABLE landing_core_transactions (
    file_id TEXT,
    file_date DATE,
    raw_data JSONB,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulates CRM extract
CREATE TABLE landing_crm_customers (
    file_id TEXT,
    file_date DATE,
    raw_data JSONB,
    loaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Bronze Layer (Raw Loaded)

```sql
CREATE TABLE bronze_transactions (
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

CREATE TABLE bronze_customers (
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

CREATE TABLE bronze_loans (
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

CREATE TABLE bronze_accounts (
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
```

### Silver Layer (Cleaned)

```sql
CREATE TABLE silver_transactions (
    transaction_id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES silver_accounts(account_id),
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_type TEXT NOT NULL,
    branch_id TEXT,
    branch_name TEXT,  -- Denormalized
    region TEXT,       -- Denormalized
    description TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE silver_customers (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    email_valid BOOLEAN,
    phone TEXT,
    phone_valid BOOLEAN,
    phone_normalized TEXT,  -- E.164 format
    address_full TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    date_of_birth DATE,
    age INTEGER,
    segment_id TEXT,
    segment_name TEXT,  -- Denormalized
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE silver_loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES silver_customers(customer_id),
    customer_name TEXT,  -- Denormalized
    product_id TEXT,
    product_name TEXT,   -- Denormalized
    principal_amount DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2),
    interest_rate DECIMAL(5,2),
    term_months INTEGER,
    start_date DATE,
    maturity_date DATE,
    collateral_value DECIMAL(15,2),
    ltv_ratio DECIMAL(5,2),  -- Loan-to-Value
    status TEXT,
    is_performing BOOLEAN,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Gold Layer (Aggregated)

```sql
CREATE TABLE gold_daily_revenue (
    date DATE PRIMARY KEY,
    total_revenue DECIMAL(15,2),
    interest_income DECIMAL(15,2),
    fee_income DECIMAL(15,2),
    transaction_count INTEGER,
    avg_transaction_value DECIMAL(15,2),
    revenue_target DECIMAL(15,2),
    variance_to_target DECIMAL(15,2),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gold_branch_metrics (
    date DATE,
    branch_id TEXT,
    branch_name TEXT,
    region TEXT,
    transaction_count INTEGER,
    total_amount DECIMAL(15,2),
    avg_transaction_value DECIMAL(15,2),
    customer_count INTEGER,
    PRIMARY KEY (date, branch_id),
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gold_loan_summary (
    date DATE PRIMARY KEY,
    total_loans_outstanding DECIMAL(15,2),
    total_loan_count INTEGER,
    avg_loan_size DECIMAL(15,2),
    total_collateral_value DECIMAL(15,2),
    collateral_coverage_ratio DECIMAL(5,2),
    npl_amount DECIMAL(15,2),
    npl_ratio DECIMAL(5,2),
    loans_by_product JSONB,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gold_customer_360 (
    customer_id TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    email_valid BOOLEAN,
    phone TEXT,
    phone_valid BOOLEAN,
    segment_name TEXT,
    total_accounts INTEGER,
    total_balance DECIMAL(15,2),
    total_loans INTEGER,
    total_loan_balance DECIMAL(15,2),
    lifetime_transactions INTEGER,
    lifetime_value DECIMAL(15,2),
    risk_score INTEGER,
    last_transaction_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Pipeline Jobs

### Job Definitions

```yaml
pipelines:
  # Landing to Bronze
  - name: load_core_transactions
    source: landing_core_transactions
    target: bronze_transactions
    schedule: "0 2 * * *"  # Daily at 2 AM
    failure_rate: 0.05     # 5% chance of failure for demo

  - name: load_crm_customers
    source: landing_crm_customers
    target: bronze_customers
    schedule: "0 3 * * *"
    failure_rate: 0.03

  - name: load_loans
    source: landing_loan_extract
    target: bronze_loans
    schedule: "0 3 * * *"
    failure_rate: 0.02

  # Bronze to Silver
  - name: clean_transactions
    source: bronze_transactions
    target: silver_transactions
    schedule: "0 4 * * *"
    depends_on: [load_core_transactions]
    transformation: |
      - Validate transaction_date
      - Join with ref_branches
      - Filter invalid amounts

  - name: clean_customers
    source: bronze_customers
    target: silver_customers
    schedule: "0 4 * * *"
    depends_on: [load_crm_customers]
    transformation: |
      - Validate and normalize phone
      - Validate email format
      - Calculate age from DOB
      - Join with ref_segments

  - name: clean_loans
    source: bronze_loans
    target: silver_loans
    schedule: "0 4 * * *"
    depends_on: [load_loans]
    transformation: |
      - Calculate LTV ratio
      - Determine performing status
      - Join with products and customers

  # Silver to Gold
  - name: aggregate_daily_revenue
    source: silver_transactions
    target: gold_daily_revenue
    schedule: "0 5 * * *"
    depends_on: [clean_transactions]

  - name: aggregate_branch_metrics
    source: silver_transactions
    target: gold_branch_metrics
    schedule: "0 5 * * *"
    depends_on: [clean_transactions]

  - name: aggregate_loan_summary
    source: silver_loans
    target: gold_loan_summary
    schedule: "0 5 * * *"
    depends_on: [clean_loans]

  - name: build_customer_360
    source: [silver_customers, silver_accounts, silver_loans, silver_transactions]
    target: gold_customer_360
    schedule: "0 6 * * *"
    depends_on: [clean_customers, clean_loans, clean_transactions]
```

---

## Issue Injection Scenarios

### Scenario 1: Missing Yesterday's Data
**Trigger**: Pipeline `load_core_transactions` fails
**Effect**: No transactions for yesterday in reports
**What Spotter sees**: Revenue report shows gap, no data for expected date
**What Debugger does**: Traces to failed pipeline, attempts restart

### Scenario 2: Missing Branch in Reference Data
**Trigger**: New branch "BR-WEST-042" in transactions but not in `ref_branches`
**Effect**: Branch metrics show NULL for branch name, revenue by branch incomplete
**What Spotter sees**: Missing category in branch breakdown
**What Debugger does**: Identifies reference gap, adds branch if validated

### Scenario 3: Phone Format Quality Issues
**Trigger**: Source system sends phones in mixed formats
**Effect**: 15% of customer phones marked invalid
**What Quality Agent sees**: Validation rule failure for phone format
**What Transformation Agent does**: Offers to normalize phones

### Scenario 4: Loan Exceeds Collateral
**Trigger**: Loan with principal $500K but collateral $300K
**Effect**: Business rule violation (LTV > 100%)
**What Quality Agent sees**: Rule failure for LTV constraint
**What creates**: High-severity issue for loan operations team

### Scenario 5: Revenue Anomaly
**Trigger**: Transaction amount multiplied by 10 for one day
**Effect**: Daily revenue spikes 1000%
**What Spotter sees**: Z-score > 5 for daily revenue metric
**What creates**: Critical anomaly alert

### Scenario 6: Stale Data
**Trigger**: Pipeline delayed by 48 hours
**Effect**: Gold tables not updated
**What Spotter sees**: Data freshness > expected threshold
**What Trust Agent does**: Marks affected assets as RED/CRITICAL

---

## Data Generation Scripts

### Customer Generator
```python
def generate_customers(count: int) -> list[dict]:
    """Generate realistic bank customers with intentional quality issues."""
    customers = []
    for i in range(count):
        # 15% invalid phones
        phone = fake.phone_number() if random.random() > 0.15 else f"BAD-{i}"

        # 8% invalid emails
        email = fake.email() if random.random() > 0.08 else f"not-an-email-{i}"

        # 3% missing segments
        segment = random.choice(SEGMENTS) if random.random() > 0.03 else None

        customers.append({
            'customer_id': f'CUST-{i:06d}',
            'first_name': fake.first_name(),
            'last_name': fake.last_name(),
            'email': email,
            'phone': phone,
            'segment_id': segment,
            # ... more fields
        })
    return customers
```

### Transaction Generator
```python
def generate_daily_transactions(date: date, customers: list, branches: list) -> list[dict]:
    """Generate daily transactions with realistic patterns."""
    base_count = 500  # Average daily transactions
    daily_count = int(np.random.normal(base_count, base_count * 0.2))

    transactions = []
    for i in range(daily_count):
        # Occasionally use unknown branch (reference data issue)
        branch = random.choice(branches) if random.random() > 0.02 else 'BR-UNKNOWN-001'

        transactions.append({
            'transaction_id': f'TXN-{date.isoformat()}-{i:06d}',
            'account_id': random.choice(customers)['customer_id'],
            'transaction_date': date,
            'amount': round(random.uniform(10, 5000), 2),
            'transaction_type': random.choice(['deposit', 'withdrawal', 'transfer', 'payment']),
            'branch_id': branch,
        })
    return transactions
```

### Issue Injector
```python
class IssueInjector:
    """Inject controlled data quality issues."""

    def inject_missing_data(self, table: str, date: date):
        """Remove all data for a specific date to simulate pipeline failure."""
        supabase.table(table).delete().eq('date', date).execute()

    def inject_anomaly(self, table: str, date: date, column: str, multiplier: float):
        """Create statistical anomaly by multiplying values."""
        supabase.table(table).update({column: column * multiplier}).eq('date', date).execute()

    def inject_reference_gap(self, ref_table: str, id_to_remove: str):
        """Remove reference data to create join failures."""
        supabase.table(ref_table).delete().eq('id', id_to_remove).execute()

    def inject_format_issues(self, table: str, column: str, bad_pattern: str, percentage: float):
        """Replace some values with malformed data."""
        # Implementation
        pass
```

---

## UI Screens

### Report Viewer
Simple HTML/React pages that display the reports. These are what Spotter will "look at" and analyze.

```
┌─────────────────────────────────────────────────────────────────────┐
│  MERIDIAN BANK - Daily Revenue Report                    2026-01-22 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ $2,450,000   │ │   +5.2%      │ │   1,247      │ │   $1,964     ││
│  │ Total Revenue│ │ vs Yesterday │ │ Transactions │ │ Avg Value    ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
│                                                                      │
│  Revenue Trend (Last 30 Days)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ $3M ─┼────────────────────────────────────────────────────────   ││
│  │      │           ╭─╮                                              ││
│  │ $2M ─┼───────╭──╯ ╰─╮────────────────────╭────────────────────   ││
│  │      │   ╭──╯       ╰───────────────╭───╯                         ││
│  │ $1M ─┼──╯                           ╰───────────────────────────  ││
│  │      │                                                            ││
│  │   $0 ─┴──────────────────────────────────────────────────────────││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
│  Revenue by Branch                                                   │
│  ┌─────────────────┬───────────┬───────────┬──────────┐             │
│  │ Branch          │ Revenue   │ Trans.    │ Avg      │             │
│  ├─────────────────┼───────────┼───────────┼──────────┤             │
│  │ Downtown Main   │ $450,000  │ 312       │ $1,442   │             │
│  │ Westside Center │ $380,000  │ 245       │ $1,551   │             │
│  │ Airport Branch  │ $320,000  │ 198       │ $1,616   │             │
│  │ [UNKNOWN]       │ $45,000   │ 28        │ $1,607   │  ⚠️ ISSUE   │
│  └─────────────────┴───────────┴───────────┴──────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### CRM Customer 360
```
┌─────────────────────────────────────────────────────────────────────┐
│  MERIDIAN BANK CRM - Customer 360                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Search: [___________________________] [🔍]                          │
│                                                                      │
│  ┌─ Customer Profile ────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  John Smith                          Segment: Premium         │  │
│  │  Customer ID: CUST-000142            Since: Jan 2018          │  │
│  │                                                                │  │
│  │  📧 john.smith@email.com  ✅         📱 555-0142  ✅          │  │
│  │  📍 123 Main St, New York, NY 10001                           │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Accounts ─────────────────────────────────────────────────────┐ │
│  │ Checking  #****1234    $12,450.00   Downtown Main              │ │
│  │ Savings   #****5678    $45,200.00   Downtown Main              │ │
│  │ Credit    #****9012    -$2,100.00   (Credit Card)              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─ Recent Transactions ─────────────────────────────────────────┐  │
│  │ 2026-01-22  Deposit      +$1,500.00  Payroll                  │  │
│  │ 2026-01-21  Transfer     -$500.00    To Savings               │  │
│  │ 2026-01-20  Purchase     -$89.99     Amazon                   │  │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL) |
| Backend | Next.js API Routes |
| Frontend | Next.js + React + Tailwind |
| Deployment | Vercel |
| Data Generation | Python scripts (can run as API routes or CLI) |
| Pipeline Simulation | Supabase Functions or Inngest |

---

## Implementation Priority

### Phase 1: Core Data (Week 1)
1. Create database schema in Supabase
2. Generate initial reference data (branches, products, segments)
3. Generate 6 months of historical customers and transactions
4. Create basic data generation scripts

### Phase 2: Reports (Week 1-2)
1. Build Daily Revenue Report page
2. Build Branch Performance Report page
3. Add data freshness indicators
4. Create report metadata for Documentarist

### Phase 3: Applications (Week 2)
1. Build Customer 360 screen
2. Build simple Call Center lookup
3. Add validation indicators (email/phone valid badges)

### Phase 4: Pipeline Simulation (Week 2-3)
1. Create pipeline status table
2. Build daily data increment simulator
3. Add failure injection capabilities
4. Create scheduled jobs for data refresh

### Phase 5: Issue Scenarios (Week 3)
1. Script each demo scenario
2. Create "reset to clean state" function
3. Create "inject issue X" functions
4. Document demo playbook

---

## Demo Playbook

### Demo 1: Spotter Detects Missing Data
1. Start with clean data
2. Trigger pipeline failure (delete yesterday's transactions)
3. Run Spotter on Daily Revenue Report
4. Show Spotter creating critical issue
5. Watch Debugger investigate and identify pipeline failure
6. Restart pipeline (inject data back)
7. Show issue auto-resolved

### Demo 2: Quality Issues in Customer Data
1. Show Customer 360 with mixed phone/email validity
2. Run Quality Agent on customer data
3. Show rules being generated and validated
4. See 15% phone failure rate issue created
5. Demonstrate Transformation Agent offering to normalize

### Demo 3: Reference Data Gap
1. Add transactions with unknown branch
2. Run Spotter on Branch Performance
3. Show "UNKNOWN" category detected
4. Debugger identifies missing reference
5. Admin adds new branch to reference table
6. Re-run shows clean report

---

*This specification defines the simulated environment for demonstrating Amygdala's capabilities. The fictional Meridian Bank provides a realistic, relatable context for showcasing data trust challenges and their agentic solutions.*
