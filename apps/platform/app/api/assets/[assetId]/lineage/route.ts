import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Consumer applications/reports that use gold layer data
const consumerDefinitions = [
  {
    id: 'consumer-001',
    name: 'Branch Performance Dashboard',
    description: 'Meridian Bank branch performance monitoring dashboard',
    type: 'dashboard',
    source_tables: ['gold_branch_metrics', 'gold_daily_revenue'],
    app: 'Meridian Bank App',
  },
  {
    id: 'consumer-002',
    name: 'Daily Revenue Report',
    description: 'Executive daily revenue summary report',
    type: 'report',
    source_tables: ['gold_daily_revenue'],
    app: 'Meridian Bank App',
  },
  {
    id: 'consumer-003',
    name: 'Loan Portfolio Dashboard',
    description: 'NPL tracking and loan portfolio analysis',
    type: 'dashboard',
    source_tables: ['gold_loan_summary', 'gold_customer_360'],
    app: 'Meridian Bank App',
  },
  {
    id: 'consumer-004',
    name: 'Customer 360 View',
    description: 'Complete customer profile including accounts, loans, and transactions',
    type: 'application',
    source_tables: ['gold_customer_360'],
    app: 'Meridian Bank App',
  },
];

// Pipeline definitions (matching Documentarist agent)
const pipelineDefinitions = [
  {
    id: 'pl-001',
    name: 'bronze_to_silver_customers',
    description: 'Cleanses customer data: validates emails, normalizes phones, calculates age',
    source_table: 'bronze_customers',
    target_table: 'silver_customers',
    schedule: 'hourly',
    is_active: true,
    transformation_logic: `
-- Cleanse and transform customer data
SELECT
  customer_id,
  CONCAT(first_name, ' ', last_name) AS full_name,
  first_name,
  last_name,
  email,
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' AS email_valid,
  phone,
  phone ~* '^\\+?[0-9]{10,15}$' AS phone_valid,
  REGEXP_REPLACE(phone, '[^0-9]', '', 'g') AS phone_normalized,
  address AS address_full,
  city,
  state,
  zip_code,
  date_of_birth,
  EXTRACT(YEAR FROM AGE(date_of_birth))::INTEGER AS age,
  segment_id,
  s.segment_name
FROM bronze_customers b
LEFT JOIN ref_customer_segments s ON b.segment_id = s.segment_id
`,
  },
  {
    id: 'pl-002',
    name: 'bronze_to_silver_transactions',
    description: 'Enriches transactions with branch details and validates data',
    source_table: 'bronze_transactions',
    target_table: 'silver_transactions',
    schedule: 'hourly',
    is_active: true,
    transformation_logic: `
-- Enrich transactions with branch information
SELECT
  t.transaction_id,
  t.account_id,
  a.customer_id,
  t.transaction_date,
  t.amount,
  t.transaction_type,
  t.branch_id,
  b.branch_name,
  b.region,
  t.description
FROM bronze_transactions t
LEFT JOIN silver_accounts a ON t.account_id = a.account_id
LEFT JOIN ref_branches b ON t.branch_id = b.branch_id
WHERE t.amount IS NOT NULL
  AND t.transaction_date IS NOT NULL
`,
  },
  {
    id: 'pl-003',
    name: 'bronze_to_silver_loans',
    description: 'Enriches loans with customer and product details, calculates LTV ratio',
    source_table: 'bronze_loans',
    target_table: 'silver_loans',
    schedule: 'daily',
    is_active: true,
    transformation_logic: `
-- Enrich loans with customer and product details
SELECT
  l.loan_id,
  l.customer_id,
  c.full_name AS customer_name,
  l.product_id,
  p.product_name,
  l.principal_amount,
  l.principal_amount AS current_balance, -- Simplified
  l.interest_rate,
  l.term_months,
  l.start_date,
  l.maturity_date,
  l.collateral_value,
  CASE
    WHEN l.collateral_value > 0
    THEN ROUND((l.principal_amount / l.collateral_value * 100)::numeric, 2)
    ELSE NULL
  END AS ltv_ratio,
  l.status,
  l.status NOT IN ('default', 'delinquent') AS is_performing
FROM bronze_loans l
LEFT JOIN silver_customers c ON l.customer_id = c.customer_id
LEFT JOIN ref_products p ON l.product_id = p.product_id
`,
  },
  {
    id: 'pl-004',
    name: 'silver_to_gold_daily_revenue',
    description: 'Aggregates daily revenue from transactions',
    source_table: 'silver_transactions',
    target_table: 'gold_daily_revenue',
    schedule: 'daily at 01:00',
    is_active: true,
    transformation_logic: `
-- Aggregate daily revenue
SELECT
  transaction_date AS date,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_revenue,
  SUM(CASE WHEN transaction_type = 'interest' THEN amount ELSE 0 END) AS interest_income,
  SUM(CASE WHEN transaction_type = 'fee' THEN amount ELSE 0 END) AS fee_income,
  COUNT(*) AS transaction_count,
  AVG(amount) AS avg_transaction_value,
  100000 AS revenue_target, -- Default target
  SUM(amount) - 100000 AS variance_to_target,
  ROUND(((SUM(amount) - 100000) / 100000 * 100)::numeric, 2) AS variance_percentage
FROM silver_transactions
WHERE transaction_date IS NOT NULL
GROUP BY transaction_date
`,
  },
  {
    id: 'pl-005',
    name: 'silver_to_gold_branch_metrics',
    description: 'Calculates branch-level metrics from transactions',
    source_table: 'silver_transactions',
    target_table: 'gold_branch_metrics',
    schedule: 'daily at 01:30',
    is_active: true,
    transformation_logic: `
-- Calculate branch performance metrics
SELECT
  transaction_date AS date,
  branch_id,
  branch_name,
  region,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_transaction_value,
  COUNT(DISTINCT customer_id) AS customer_count
FROM silver_transactions
WHERE branch_id IS NOT NULL
  AND transaction_date IS NOT NULL
GROUP BY transaction_date, branch_id, branch_name, region
`,
  },
  {
    id: 'pl-006',
    name: 'silver_to_gold_loan_summary',
    description: 'Aggregates loan portfolio metrics',
    source_table: 'silver_loans',
    target_table: 'gold_loan_summary',
    schedule: 'daily at 02:00',
    is_active: true,
    transformation_logic: `
-- Aggregate loan portfolio metrics
SELECT
  CURRENT_DATE AS date,
  SUM(current_balance) AS total_loans_outstanding,
  COUNT(*) AS total_loan_count,
  AVG(principal_amount) AS avg_loan_size,
  SUM(collateral_value) AS total_collateral_value,
  ROUND((SUM(collateral_value) / NULLIF(SUM(current_balance), 0))::numeric, 2) AS collateral_coverage_ratio,
  SUM(CASE WHEN NOT is_performing THEN current_balance ELSE 0 END) AS npl_amount,
  COUNT(CASE WHEN NOT is_performing THEN 1 END) AS npl_count,
  ROUND((COUNT(CASE WHEN NOT is_performing THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100)::numeric, 2) AS npl_ratio
FROM silver_loans
`,
  },
  {
    id: 'pl-007',
    name: 'silver_to_gold_customer_360',
    description: 'Creates customer 360 view combining accounts, loans, and transactions',
    source_table: 'silver_customers',
    target_table: 'gold_customer_360',
    schedule: 'daily at 03:00',
    is_active: true,
    transformation_logic: `
-- Create customer 360 view
SELECT
  c.customer_id,
  c.full_name,
  c.email,
  c.email_valid,
  c.phone,
  c.phone_valid,
  c.segment_name,
  COALESCE(acc.account_count, 0) AS total_accounts,
  COALESCE(acc.total_balance, 0) AS total_balance,
  COALESCE(l.loan_count, 0) AS total_loans,
  COALESCE(l.loan_balance, 0) AS total_loan_balance,
  COALESCE(t.transaction_count, 0) AS lifetime_transactions,
  COALESCE(t.total_value, 0) AS lifetime_value,
  CASE
    WHEN l.npl_count > 0 THEN 1
    WHEN c.email_valid = false THEN 2
    ELSE 5
  END AS risk_score,
  t.last_transaction_date
FROM silver_customers c
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS account_count, SUM(balance) AS total_balance
  FROM silver_accounts GROUP BY customer_id
) acc ON c.customer_id = acc.customer_id
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS loan_count, SUM(current_balance) AS loan_balance,
         COUNT(CASE WHEN NOT is_performing THEN 1 END) AS npl_count
  FROM silver_loans GROUP BY customer_id
) l ON c.customer_id = l.customer_id
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS transaction_count, SUM(amount) AS total_value,
         MAX(transaction_date) AS last_transaction_date
  FROM silver_transactions GROUP BY customer_id
) t ON c.customer_id = t.customer_id
`,
  },
];

// Helper function to extract source tables from SQL
function extractSourceTablesFromSQL(sql: string): string[] {
  const tables: string[] = [];

  // Match FROM and JOIN clauses
  const fromMatches = sql.match(/FROM\s+([a-z_]+)/gi) || [];
  const joinMatches = sql.match(/JOIN\s+([a-z_]+)/gi) || [];

  [...fromMatches, ...joinMatches].forEach(match => {
    const tableName = match.replace(/^(FROM|JOIN)\s+/i, '').trim();
    if (!tables.includes(tableName) && !tableName.startsWith('(')) {
      tables.push(tableName);
    }
  });

  return tables;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'amygdala' },
    });

    // Get the asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Find pipelines that produce this asset (incoming)
    const incomingPipelines = pipelineDefinitions.filter(
      (p) => p.target_table === asset.name
    );

    // Find pipelines that consume this asset (outgoing)
    const outgoingPipelines = pipelineDefinitions.filter(
      (p) => p.source_table === asset.name
    );

    // Extract ALL source tables from the incoming pipeline SQL
    const sqlSourceTables: string[] = [];
    incomingPipelines.forEach(p => {
      const tables = extractSourceTablesFromSQL(p.transformation_logic);
      tables.forEach(t => {
        if (!sqlSourceTables.includes(t)) {
          sqlSourceTables.push(t);
        }
      });
    });

    // Combine stored upstream with SQL-detected sources
    const upstreamNames = [...new Set([...(asset.upstream_assets || []), ...sqlSourceTables])];

    // Get upstream assets with details
    let upstreamAssets: any[] = [];
    if (upstreamNames.length > 0) {
      const { data: upstream } = await supabase
        .from('assets')
        .select('id, name, asset_type, layer, fitness_status')
        .in('name', upstreamNames);
      upstreamAssets = upstream || [];
    }

    // Find consumers that use this asset (for gold layer)
    const consumers = consumerDefinitions.filter(c =>
      c.source_tables.includes(asset.name)
    );

    // Get downstream assets with details
    const downstreamNames = asset.downstream_assets || [];
    let downstreamAssets: any[] = [];
    if (downstreamNames.length > 0) {
      const { data: downstream } = await supabase
        .from('assets')
        .select('id, name, asset_type, layer, fitness_status')
        .in('name', downstreamNames);
      downstreamAssets = downstream || [];
    }

    // Build lineage response with pipeline details
    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        layer: asset.layer,
        fitness_status: asset.fitness_status,
      },
      upstream: {
        assets: upstreamAssets,
        pipelines: incomingPipelines.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          source_table: p.source_table,
          schedule: p.schedule,
          is_active: p.is_active,
          transformation_logic: p.transformation_logic,
        })),
        // Include all SQL-detected source tables for reference
        sqlSourceTables,
      },
      downstream: {
        assets: downstreamAssets,
        pipelines: outgoingPipelines.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          target_table: p.target_table,
          schedule: p.schedule,
          is_active: p.is_active,
          transformation_logic: p.transformation_logic,
        })),
        // Include consumer applications/reports
        consumers: consumers.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          app: c.app,
        })),
      },
      dataFlow: {
        // Build a simplified data flow diagram
        nodes: [
          ...upstreamAssets.map((a) => ({
            id: a.id,
            name: a.name,
            type: 'upstream',
            layer: a.layer,
          })),
          {
            id: asset.id,
            name: asset.name,
            type: 'current',
            layer: asset.layer,
          },
          ...downstreamAssets.map((a) => ({
            id: a.id,
            name: a.name,
            type: 'downstream',
            layer: a.layer,
          })),
          ...consumers.map((c) => ({
            id: c.id,
            name: c.name,
            type: 'consumer',
            layer: 'consumer',
            app: c.app,
          })),
        ],
        edges: [
          ...incomingPipelines.map((p) => ({
            source: p.source_table,
            target: p.target_table,
            pipeline: p.name,
          })),
          ...outgoingPipelines.map((p) => ({
            source: p.source_table,
            target: p.target_table,
            pipeline: p.name,
          })),
          // Consumer edges
          ...consumers.map((c) => ({
            source: asset.name,
            target: c.name,
            type: 'consumes',
          })),
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching lineage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lineage' },
      { status: 500 }
    );
  }
}
