import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

// Predefined assets representing Meridian Bank data
const MERIDIAN_ASSETS = [
  // Consumer Layer - Reports & Dashboards
  {
    name: 'Executive Revenue Dashboard',
    asset_type: 'dashboard',
    layer: 'consumer',
    description: 'Executive dashboard showing daily revenue, trends, and branch performance metrics',
    business_context: 'Used by C-suite and regional managers for daily business monitoring',
    tags: ['revenue', 'executive', 'kpi', 'dashboard'],
    owner: 'Finance Team',
    steward: 'Data Analytics',
    upstream_assets: ['gold_daily_revenue', 'gold_branch_metrics'],
    source_table: 'gold_daily_revenue',
    quality_score: 95.0,
    trust_score_stars: 5,
    trust_score_raw: 0.95,
    fitness_status: 'green',
    metadata: { refreshFrequency: 'daily', viewers: 45 }
  },
  {
    name: 'Branch Performance Report',
    asset_type: 'report',
    layer: 'consumer',
    description: 'Monthly branch performance report with transaction volumes, revenue, and customer metrics',
    business_context: 'Used by branch managers and regional directors for performance reviews',
    tags: ['branch', 'performance', 'monthly', 'report'],
    owner: 'Operations Team',
    steward: 'Data Analytics',
    upstream_assets: ['gold_branch_metrics', 'silver_transactions'],
    source_table: 'gold_branch_metrics',
    quality_score: 88.0,
    trust_score_stars: 4,
    trust_score_raw: 0.88,
    fitness_status: 'green',
    metadata: { refreshFrequency: 'monthly', viewers: 120 }
  },
  {
    name: 'Loan Portfolio Report',
    asset_type: 'report',
    layer: 'consumer',
    description: 'Comprehensive loan portfolio analysis with risk metrics and delinquency tracking',
    business_context: 'Used by risk management and credit teams for portfolio monitoring',
    tags: ['loans', 'risk', 'portfolio', 'delinquency'],
    owner: 'Risk Management',
    steward: 'Credit Analytics',
    upstream_assets: ['silver_loans', 'silver_customers'],
    source_table: 'bronze_loans',
    quality_score: 72.0,
    trust_score_stars: 3,
    trust_score_raw: 0.72,
    fitness_status: 'amber',
    metadata: { refreshFrequency: 'daily', viewers: 35 }
  },
  {
    name: 'Customer 360 Application',
    asset_type: 'application_screen',
    layer: 'consumer',
    description: 'Unified customer view showing demographics, accounts, transactions, and service history',
    business_context: 'Primary interface for customer service representatives',
    tags: ['customer', '360', 'crm', 'service'],
    owner: 'Customer Service',
    steward: 'Data Platform',
    upstream_assets: ['silver_customers', 'silver_transactions', 'silver_loans'],
    source_table: 'silver_customers',
    quality_score: 85.0,
    trust_score_stars: 4,
    trust_score_raw: 0.85,
    fitness_status: 'green',
    metadata: { refreshFrequency: 'real-time', activeUsers: 250 }
  },

  // Gold Layer - Aggregated/Curated
  {
    name: 'gold_daily_revenue',
    asset_type: 'table',
    layer: 'gold',
    description: 'Daily aggregated revenue metrics by date including total revenue, transaction count, and customer count',
    business_context: 'Foundation for executive dashboards and financial reporting',
    tags: ['revenue', 'daily', 'aggregate', 'finance'],
    owner: 'Data Engineering',
    steward: 'Finance Team',
    upstream_assets: ['silver_transactions'],
    downstream_assets: ['Executive Revenue Dashboard'],
    source_table: 'meridian.gold_daily_revenue',
    quality_score: 95.0,
    trust_score_stars: 5,
    trust_score_raw: 0.95,
    fitness_status: 'green',
    metadata: { rowCount: 180, lastRefresh: new Date().toISOString() }
  },
  {
    name: 'gold_branch_metrics',
    asset_type: 'table',
    layer: 'gold',
    description: 'Branch-level daily metrics including transaction volumes, revenue, and performance indicators',
    business_context: 'Used for branch performance tracking and regional analysis',
    tags: ['branch', 'metrics', 'performance', 'daily'],
    owner: 'Data Engineering',
    steward: 'Operations Team',
    upstream_assets: ['silver_transactions', 'ref_branches'],
    downstream_assets: ['Branch Performance Report'],
    source_table: 'meridian.gold_branch_metrics',
    quality_score: 92.0,
    trust_score_stars: 5,
    trust_score_raw: 0.92,
    fitness_status: 'green',
    metadata: { rowCount: 1080, lastRefresh: new Date().toISOString() }
  },

  // Silver Layer - Cleansed/Standardized
  {
    name: 'silver_customers',
    asset_type: 'table',
    layer: 'silver',
    description: 'Cleansed customer master data with validated contact information and segmentation',
    business_context: 'Primary source for customer information across all applications',
    tags: ['customer', 'master', 'pii', 'cleansed'],
    owner: 'Data Engineering',
    steward: 'Customer Data Team',
    upstream_assets: ['bronze_customers'],
    downstream_assets: ['Customer 360 Application', 'gold_branch_metrics'],
    source_table: 'meridian.silver_customers',
    quality_score: 87.0,
    trust_score_stars: 4,
    trust_score_raw: 0.87,
    fitness_status: 'green',
    metadata: { rowCount: 5000, piiColumns: ['email', 'phone', 'ssn'] }
  },
  {
    name: 'silver_transactions',
    asset_type: 'table',
    layer: 'silver',
    description: 'Cleansed transaction records with validated branch references and standardized amounts',
    business_context: 'Source of truth for all financial transactions',
    tags: ['transactions', 'financial', 'cleansed'],
    owner: 'Data Engineering',
    steward: 'Finance Team',
    upstream_assets: ['bronze_transactions'],
    downstream_assets: ['gold_daily_revenue', 'gold_branch_metrics'],
    source_table: 'meridian.silver_transactions',
    quality_score: 78.0,
    trust_score_stars: 4,
    trust_score_raw: 0.78,
    fitness_status: 'amber',
    trust_explanation: 'Some transactions reference unknown branches (BR-UNKNOWN-001)',
    metadata: { rowCount: 90000, unknownBranchRate: '2.5%' }
  },
  {
    name: 'silver_loans',
    asset_type: 'table',
    layer: 'silver',
    description: 'Loan portfolio data with risk metrics, payment status, and collateral information',
    business_context: 'Primary source for loan analytics and risk management',
    tags: ['loans', 'credit', 'risk', 'portfolio'],
    owner: 'Data Engineering',
    steward: 'Risk Management',
    upstream_assets: ['bronze_loans', 'silver_customers'],
    downstream_assets: ['Loan Portfolio Report'],
    source_table: 'meridian.bronze_loans',
    quality_score: 65.0,
    trust_score_stars: 3,
    trust_score_raw: 0.65,
    fitness_status: 'amber',
    trust_explanation: 'Missing collateral values for some secured loans',
    metadata: { rowCount: 2000, delinquencyRate: '8%' }
  },

  // Reference Data
  {
    name: 'ref_branches',
    asset_type: 'table',
    layer: 'silver',
    description: 'Reference table of all bank branches with location and status information',
    business_context: 'Master list of branches for data validation and reporting',
    tags: ['reference', 'branches', 'master'],
    owner: 'Data Engineering',
    steward: 'Operations Team',
    source_table: 'meridian.ref_branches',
    quality_score: 100.0,
    trust_score_stars: 5,
    trust_score_raw: 1.0,
    fitness_status: 'green',
    metadata: { rowCount: 6 }
  },
  {
    name: 'ref_customer_segments',
    asset_type: 'table',
    layer: 'silver',
    description: 'Customer segmentation definitions with criteria and business descriptions',
    business_context: 'Used for customer classification and targeted marketing',
    tags: ['reference', 'segments', 'customer', 'classification'],
    owner: 'Data Engineering',
    steward: 'Marketing Team',
    source_table: 'meridian.ref_customer_segments',
    quality_score: 100.0,
    trust_score_stars: 5,
    trust_score_raw: 1.0,
    fitness_status: 'green',
    metadata: { rowCount: 5 }
  },

  // Bronze Layer - Raw
  {
    name: 'bronze_loans',
    asset_type: 'table',
    layer: 'bronze',
    description: 'Raw loan data as received from core banking system',
    business_context: 'Source data for loan processing and analytics',
    tags: ['raw', 'loans', 'source'],
    owner: 'Data Engineering',
    steward: 'IT Systems',
    downstream_assets: ['silver_loans'],
    source_table: 'meridian.bronze_loans',
    quality_score: 55.0,
    trust_score_stars: 2,
    trust_score_raw: 0.55,
    fitness_status: 'red',
    trust_explanation: 'Raw data with known quality issues requiring cleansing',
    metadata: { rowCount: 2000, sourcSystem: 'CoreBanking' }
  }
];

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clearFirst = searchParams.get('clear') === 'true';

    const supabase = getAmygdalaClient();
    const results: Record<string, unknown> = {};

    // Clear existing assets if requested
    if (clearFirst) {
      console.log('Clearing existing assets...');
      const { error } = await supabase.from('assets').delete().neq('id', '');
      if (error) {
        results.clearError = error.message;
      } else {
        results.cleared = true;
      }
    }

    // Check if assets already exist
    const { count } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0 && !clearFirst) {
      return NextResponse.json({
        success: true,
        message: 'Assets already exist. Use ?clear=true to replace them.',
        existingCount: count
      });
    }

    // Insert assets
    console.log(`Seeding ${MERIDIAN_ASSETS.length} assets...`);
    const { data, error } = await supabase
      .from('assets')
      .insert(MERIDIAN_ASSETS)
      .select();

    if (error) {
      throw new Error(`Failed to seed assets: ${error.message}`);
    }

    results.assetsCreated = data?.length || 0;

    // Count by layer
    const layerCounts: Record<string, number> = {};
    MERIDIAN_ASSETS.forEach((a) => {
      layerCounts[a.layer] = (layerCounts[a.layer] || 0) + 1;
    });
    results.byLayer = layerCounts;

    // Count by fitness
    const fitnessCounts: Record<string, number> = { green: 0, amber: 0, red: 0 };
    MERIDIAN_ASSETS.forEach((a) => {
      fitnessCounts[a.fitness_status] = (fitnessCounts[a.fitness_status] || 0) + 1;
    });
    results.byFitness = fitnessCounts;

    // Seed Data Products
    console.log('Seeding data products...');

    // Clear existing products if clearing
    if (clearFirst) {
      await supabase.from('data_product_assets').delete().neq('id', '');
      await supabase.from('data_products').delete().neq('id', '');
    }

    // Create data products
    const dataProducts = [
      {
        name: 'Executive Analytics',
        description: 'Comprehensive analytics suite for executive decision making including revenue, performance, and operational insights.',
        business_purpose: 'Enable data-driven strategic decisions at the executive level with trusted, high-quality metrics.',
        domain: 'Finance',
        type: 'consumer-aligned',
        status: 'published',
        owner: 'CFO Office',
        steward: 'Data Analytics',
        icon: '📊',
        color: '#22c55e',
        tags: ['executive', 'revenue', 'kpi', 'strategic'],
        published_at: new Date().toISOString(),
      },
      {
        name: 'Customer Intelligence',
        description: 'Unified customer data product providing 360-degree customer views, segmentation, and service analytics.',
        business_purpose: 'Empower customer-facing teams with complete, accurate customer information for personalized service.',
        domain: 'Customer Success',
        type: 'aggregate',
        status: 'published',
        owner: 'Head of Customer Experience',
        steward: 'Customer Data Team',
        icon: '👥',
        color: '#3b82f6',
        tags: ['customer', '360', 'crm', 'service'],
        published_at: new Date().toISOString(),
      },
      {
        name: 'Risk & Compliance',
        description: 'Risk analytics and compliance reporting data product for loan portfolio monitoring and regulatory requirements.',
        business_purpose: 'Provide risk management team with timely, accurate data for portfolio monitoring and regulatory compliance.',
        domain: 'Risk & Compliance',
        type: 'aggregate',
        status: 'draft',
        owner: 'Chief Risk Officer',
        steward: 'Risk Management',
        icon: '⚠️',
        color: '#ef4444',
        tags: ['risk', 'loans', 'compliance', 'regulatory'],
      },
      {
        name: 'Branch Operations',
        description: 'Operational metrics and performance data for branch network management and optimization.',
        business_purpose: 'Enable operations team to monitor and optimize branch performance across the network.',
        domain: 'Operations',
        type: 'aggregate',
        status: 'published',
        owner: 'Head of Operations',
        steward: 'Operations Team',
        icon: '🏦',
        color: '#f59e0b',
        tags: ['branch', 'operations', 'performance'],
        published_at: new Date().toISOString(),
      },
    ];

    const { data: createdProducts, error: productError } = await supabase
      .from('data_products')
      .insert(dataProducts)
      .select();

    if (productError) {
      console.error('Failed to seed products:', productError.message);
      results.productError = productError.message;
    } else {
      results.productsCreated = createdProducts?.length || 0;

      // Create asset links based on asset names and product domains
      const assetMap = new Map(data?.map((a: any) => [a.name, a.id]) || []);
      const productAssetLinks: { product_id: string; asset_id: string; role: string }[] = [];

      createdProducts?.forEach((product: any) => {
        if (product.name === 'Executive Analytics') {
          // Link executive dashboards and revenue data
          ['Executive Revenue Dashboard', 'Branch Performance Report', 'gold_daily_revenue', 'gold_branch_metrics'].forEach(assetName => {
            const assetId = assetMap.get(assetName);
            if (assetId) {
              productAssetLinks.push({
                product_id: product.id,
                asset_id: assetId,
                role: assetName.includes('Dashboard') || assetName.includes('Report') ? 'primary' : 'supporting',
              });
            }
          });
        } else if (product.name === 'Customer Intelligence') {
          // Link customer-related assets
          ['Customer 360 Application', 'silver_customers', 'ref_customer_segments'].forEach(assetName => {
            const assetId = assetMap.get(assetName);
            if (assetId) {
              productAssetLinks.push({
                product_id: product.id,
                asset_id: assetId,
                role: assetName.includes('Application') ? 'primary' : 'supporting',
              });
            }
          });
        } else if (product.name === 'Risk & Compliance') {
          // Link risk-related assets
          ['Loan Portfolio Report', 'silver_loans', 'bronze_loans'].forEach(assetName => {
            const assetId = assetMap.get(assetName);
            if (assetId) {
              productAssetLinks.push({
                product_id: product.id,
                asset_id: assetId,
                role: assetName.includes('Report') ? 'primary' : 'supporting',
              });
            }
          });
        } else if (product.name === 'Branch Operations') {
          // Link operations-related assets
          ['Branch Performance Report', 'gold_branch_metrics', 'ref_branches', 'silver_transactions'].forEach(assetName => {
            const assetId = assetMap.get(assetName);
            if (assetId) {
              productAssetLinks.push({
                product_id: product.id,
                asset_id: assetId,
                role: assetName.includes('Report') || assetName.includes('gold') ? 'primary' : 'supporting',
              });
            }
          });
        }
      });

      if (productAssetLinks.length > 0) {
        const { error: linkError } = await supabase
          .from('data_product_assets')
          .insert(productAssetLinks);

        if (linkError) {
          console.error('Failed to link assets to products:', linkError.message);
          results.linkError = linkError.message;
        } else {
          results.assetLinksCreated = productAssetLinks.length;
        }
      }
    }

    console.log('Asset seed completed!');

    // Seed sample automations
    console.log('Seeding sample automations...');

    // Clear existing sample automations if clearing
    if (clearFirst) {
      await supabase.from('automation_schedules').delete().neq('id', '');
      await supabase.from('automation_runs').delete().neq('id', '');
      await supabase.from('automations').delete().eq('created_by', 'system');
    }

    // Check if sample automations exist
    const { count: automationCount } = await supabase
      .from('automations')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', 'system');

    if (!automationCount || automationCount === 0 || clearFirst) {
      const sampleAutomations = [
        {
          name: 'Daily Key Tables DQ Report',
          description: 'Checks data quality of key business tables via Ataccama MCP every day at 8 AM and sends a report. Creates issues for tables below quality threshold.',
          enabled: false,
          trigger: {
            type: 'scheduled',
            interval: { type: 'days', value: 1, at: '08:00' }
          },
          conditions: [],
          actions: [
            {
              type: 'check_ataccama_dq',
              tables: ['BANK_TRANSACTIONS', 'CUSTOMER_360', 'TRANSACTIONS_GOLD', 'REVENUE_DAILY'],
              thresholds: { excellent: 90, good: 75, fair: 60 },
              createIssueOnFailure: true,
              failureThreshold: 70
            },
            {
              type: 'send_notification',
              channel: 'email',
              recipients: ['data-team@company.com'],
              template: {
                subject: 'Daily Data Quality Report - {{trigger.timestamp}}',
                body: '{{previous_action.result.report}}'
              }
            }
          ],
          created_by: 'system'
        },
        {
          name: 'Weekly DQ Trend Analysis',
          description: 'Runs comprehensive DQ check on all critical tables weekly and alerts on any degradation',
          enabled: false,
          trigger: {
            type: 'scheduled',
            interval: { type: 'weeks', value: 1, at: '06:00', dayOfWeek: 1 }
          },
          conditions: [],
          actions: [
            {
              type: 'check_ataccama_dq',
              tables: ['CUSTOMER_360', 'CUSTOMER_RAW', 'TRANSACTIONS_GOLD', 'REVENUE_DAILY', 'FRAUD_EVENTS', 'BANK_TRANSACTIONS'],
              thresholds: { excellent: 90, good: 75, fair: 60 },
              createIssueOnFailure: true,
              failureThreshold: 60
            },
            {
              type: 'send_notification',
              channel: 'webhook',
              webhookUrl: '{{env.SLACK_WEBHOOK_URL}}',
              template: {
                body: '⚠️ *Weekly DQ Alert*: Data Quality Report\\n\\n{{previous_action.result.report}}'
              }
            }
          ],
          created_by: 'system'
        },
        {
          name: 'Daily Unowned Asset Check',
          description: 'Automatically creates issues for assets without an assigned owner, running every day at 9 AM',
          enabled: false,
          trigger: {
            type: 'scheduled',
            interval: { type: 'days', value: 1, at: '09:00' }
          },
          conditions: [{ field: 'owner', operator: 'is_empty' }],
          actions: [
            {
              type: 'create_record',
              entityType: 'issue',
              data: {
                title: "Asset '{{record.name}}' has no owner",
                description: 'This asset was detected without an owner during automated governance check.',
                severity: 'medium',
                issue_type: 'ownership_missing'
              }
            }
          ],
          created_by: 'system'
        },
        {
          name: 'Critical Issue Alert',
          description: 'Sends notification when a critical issue is created',
          enabled: false,
          trigger: {
            type: 'record_created',
            entityType: 'issue',
            filter: { field: 'severity', operator: 'equals', value: 'critical' }
          },
          conditions: [],
          actions: [
            {
              type: 'send_notification',
              channel: 'webhook',
              webhookUrl: '{{env.SLACK_WEBHOOK_URL}}',
              template: {
                body: '🚨 Critical issue detected: {{record.title}}'
              }
            }
          ],
          created_by: 'system'
        },
        {
          name: 'Low Trust Score Monitor',
          description: "Triggers Debugger agent when an asset's trust score drops below 2 stars",
          enabled: false,
          trigger: {
            type: 'record_matches',
            entityType: 'asset',
            conditions: [{ field: 'trust_score_stars', operator: 'less_than', value: 2 }],
            checkInterval: 60
          },
          conditions: [{ field: 'layer', operator: 'in', value: ['gold', 'silver'] }],
          actions: [
            {
              type: 'run_agent',
              agentName: 'debugger',
              context: { assetId: '{{record.id}}' }
            }
          ],
          created_by: 'system'
        }
      ];

      const { data: createdAutomations, error: automationError } = await supabase
        .from('automations')
        .insert(sampleAutomations)
        .select();

      if (automationError) {
        console.error('Failed to seed automations:', automationError.message);
        results.automationError = automationError.message;
      } else {
        results.automationsCreated = createdAutomations?.length || 0;
        console.log(`Created ${createdAutomations?.length || 0} sample automations`);
      }
    } else {
      results.automationsExisting = automationCount;
    }

    console.log('Seed completed!');

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalAssets: MERIDIAN_ASSETS.length,
        byLayer: layerCounts,
        byFitness: fitnessCounts,
        productsCreated: results.productsCreated || 0,
        assetLinksCreated: results.assetLinksCreated || 0,
        automationsCreated: results.automationsCreated || results.automationsExisting || 0,
      }
    });
  } catch (error) {
    console.error('Asset seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Amygdala Asset Seeder',
    usage: 'POST /api/seed?clear=true',
    parameters: {
      clear: 'Clear existing assets first (default: false)'
    },
    assets: MERIDIAN_ASSETS.map(a => ({ name: a.name, layer: a.layer, type: a.asset_type }))
  });
}
