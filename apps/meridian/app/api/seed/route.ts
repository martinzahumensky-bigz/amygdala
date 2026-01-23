import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateCustomers,
  generateTransactions,
  calculateDailyRevenue,
  calculateBranchMetrics,
  getDateRange,
  BRANCHES,
  CUSTOMER_SEGMENTS,
  resetSeed
} from '@/lib/generators';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerCount = parseInt(searchParams.get('customers') || '5000');
    const daysBack = parseInt(searchParams.get('days') || '180');
    const clearFirst = searchParams.get('clear') === 'true';

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: { schema: 'meridian' }
    });

    const results: Record<string, unknown> = {};

    // Clear existing data if requested
    if (clearFirst) {
      console.log('Clearing existing data...');

      await supabase.from('gold_branch_metrics').delete().neq('date', '1900-01-01');
      await supabase.from('gold_daily_revenue').delete().neq('date', '1900-01-01');
      await supabase.from('silver_transactions').delete().neq('transaction_id', '');
      await supabase.from('silver_customers').delete().neq('customer_id', '');
      await supabase.from('ref_customer_segments').delete().neq('segment_id', '');
      await supabase.from('ref_branches').delete().neq('branch_id', '');

      results.cleared = true;
    }

    // Reset random seed for reproducibility
    resetSeed(12345);

    // 1. Seed reference data - Branches
    console.log('Seeding branches...');
    const branchData = BRANCHES.map(b => ({
      ...b,
      country: 'USA',
      opened_date: '2020-01-01',
      status: 'active'
    }));

    const { error: branchError } = await supabase
      .schema('meridian')
      .from('ref_branches')
      .upsert(branchData, { onConflict: 'branch_id' });

    if (branchError) {
      console.error('Branch error:', branchError);
      results.branchError = branchError.message;
    } else {
      results.branches = BRANCHES.length;
    }

    // 2. Seed reference data - Customer Segments
    console.log('Seeding customer segments...');
    const { error: segmentError } = await supabase
      .schema('meridian')
      .from('ref_customer_segments')
      .upsert(CUSTOMER_SEGMENTS, { onConflict: 'segment_id' });

    if (segmentError) {
      console.error('Segment error:', segmentError);
      results.segmentError = segmentError.message;
    } else {
      results.segments = CUSTOMER_SEGMENTS.length;
    }

    // 3. Generate and seed customers
    console.log(`Generating ${customerCount} customers...`);
    const customers = generateCustomers(customerCount);

    // Insert in batches
    const customerBatchSize = 500;
    let customersInserted = 0;

    for (let i = 0; i < customers.length; i += customerBatchSize) {
      const batch = customers.slice(i, i + customerBatchSize);
      const { error } = await supabase
        .schema('meridian')
        .from('silver_customers')
        .upsert(batch, { onConflict: 'customer_id' });

      if (error) {
        console.error(`Customer batch ${i} error:`, error);
        results.customerError = error.message;
        break;
      }
      customersInserted += batch.length;
    }
    results.customers = customersInserted;

    // Count quality issues
    const invalidPhones = customers.filter(c => !c.phone_valid).length;
    const invalidEmails = customers.filter(c => !c.email_valid).length;
    const missingSegments = customers.filter(c => !c.segment_id).length;

    results.qualityIssues = {
      invalidPhones,
      invalidEmails,
      missingSegments,
      invalidPhonePercent: ((invalidPhones / customers.length) * 100).toFixed(1) + '%',
      invalidEmailPercent: ((invalidEmails / customers.length) * 100).toFixed(1) + '%',
      missingSegmentPercent: ((missingSegments / customers.length) * 100).toFixed(1) + '%'
    };

    // 4. Generate transactions
    console.log(`Generating ${daysBack} days of transactions...`);
    const { start, end } = getDateRange(daysBack);
    const customerIds = customers.map(c => c.customer_id);

    const transactions = generateTransactions(start, end, customerIds, {
      baseTransactionsPerDay: 500,
      includeUnknownBranch: true
    });

    // Insert transactions in batches
    const txnBatchSize = 1000;
    let txnsInserted = 0;

    for (let i = 0; i < transactions.length; i += txnBatchSize) {
      const batch = transactions.slice(i, i + txnBatchSize);
      const { error } = await supabase
        .schema('meridian')
        .from('silver_transactions')
        .upsert(batch, { onConflict: 'transaction_id' });

      if (error) {
        console.error(`Transaction batch ${i} error:`, error);
        results.transactionError = error.message;
        break;
      }
      txnsInserted += batch.length;

      // Log progress every 10k transactions
      if (txnsInserted % 10000 === 0) {
        console.log(`Inserted ${txnsInserted} transactions...`);
      }
    }
    results.transactions = txnsInserted;

    // Count unknown branch transactions
    const unknownBranchTxns = transactions.filter(t => t.branch_id === 'BR-UNKNOWN-001').length;
    results.unknownBranchTransactions = unknownBranchTxns;

    // 5. Calculate and insert daily revenue
    console.log('Calculating daily revenue...');
    const dailyRevenue = calculateDailyRevenue(transactions);

    const { error: revenueError } = await supabase
      .schema('meridian')
      .from('gold_daily_revenue')
      .upsert(dailyRevenue, { onConflict: 'date' });

    if (revenueError) {
      console.error('Revenue error:', revenueError);
      results.revenueError = revenueError.message;
    } else {
      results.dailyRevenueRecords = dailyRevenue.length;
    }

    // 6. Calculate and insert branch metrics
    console.log('Calculating branch metrics...');
    const branchMetrics = calculateBranchMetrics(transactions);

    // Insert in batches
    const metricsBatchSize = 500;
    let metricsInserted = 0;

    for (let i = 0; i < branchMetrics.length; i += metricsBatchSize) {
      const batch = branchMetrics.slice(i, i + metricsBatchSize);
      const { error } = await supabase
        .schema('meridian')
        .from('gold_branch_metrics')
        .upsert(batch, { onConflict: 'date,branch_id' });

      if (error) {
        console.error(`Metrics batch ${i} error:`, error);
        results.metricsError = error.message;
        break;
      }
      metricsInserted += batch.length;
    }
    results.branchMetricsRecords = metricsInserted;

    console.log('Seed completed!');

    return NextResponse.json({
      success: true,
      results,
      summary: {
        customers: customersInserted,
        transactions: txnsInserted,
        dailyRevenueRecords: dailyRevenue.length,
        branchMetricsRecords: metricsInserted,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Meridian Bank Data Seeder',
    usage: 'POST /api/seed?customers=5000&days=180&clear=true',
    parameters: {
      customers: 'Number of customers to generate (default: 5000)',
      days: 'Days of transaction history (default: 180)',
      clear: 'Clear existing data first (default: false)'
    }
  });
}
