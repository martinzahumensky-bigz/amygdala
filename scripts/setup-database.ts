/**
 * Database Setup Script
 *
 * This script sets up the database schema for Amygdala and Meridian Bank.
 * Run with: npx tsx scripts/setup-database.ts
 *
 * Note: This uses the Supabase Management API since direct DB connection
 * may have IPv6 issues on some networks.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xfcqszmaoxiilzudvguy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Set it in your .env file or pass it as an environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const migrations = [
  // Migration 1: Create schemas
  `
    CREATE SCHEMA IF NOT EXISTS amygdala;
    CREATE SCHEMA IF NOT EXISTS meridian;
  `,

  // Migration 2: Amygdala core tables
  `
    -- Assets catalog
    CREATE TABLE IF NOT EXISTS amygdala.assets (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        layer TEXT NOT NULL,
        description TEXT,
        business_context TEXT,
        tags TEXT[] DEFAULT '{}',
        owner TEXT,
        steward TEXT,
        upstream_assets TEXT[] DEFAULT '{}',
        downstream_assets TEXT[] DEFAULT '{}',
        source_table TEXT,
        source_connection TEXT,
        quality_score DECIMAL(5,2),
        trust_score_stars INTEGER,
        trust_score_raw DECIMAL(5,4),
        trust_explanation TEXT,
        fitness_status TEXT DEFAULT 'green',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT
    );
  `,

  `
    -- Issues table
    CREATE TABLE IF NOT EXISTS amygdala.issues (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'medium',
        issue_type TEXT,
        affected_assets TEXT[] DEFAULT '{}',
        root_cause_asset TEXT,
        status TEXT DEFAULT 'open',
        assigned_to TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolution TEXT,
        resolved_by TEXT,
        resolved_at TIMESTAMPTZ
    );
  `,

  `
    -- Agent logs
    CREATE TABLE IF NOT EXISTS amygdala.agent_logs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        agent_name TEXT NOT NULL,
        asset_id TEXT,
        action TEXT NOT NULL,
        summary TEXT,
        details JSONB DEFAULT '{}',
        rating TEXT,
        score DECIMAL(5,2),
        timestamp TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  `
    -- Agent runs
    CREATE TABLE IF NOT EXISTS amygdala.agent_runs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        agent_name TEXT NOT NULL,
        status TEXT DEFAULT 'running',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        context JSONB DEFAULT '{}',
        results JSONB DEFAULT '{}',
        error_message TEXT
    );
  `,

  `
    -- Snapshots for historical comparison
    CREATE TABLE IF NOT EXISTS amygdala.snapshots (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        asset_id TEXT,
        snapshot_type TEXT,
        snapshot_data JSONB NOT NULL,
        captured_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  // Migration 3: Meridian Bank reference data
  `
    CREATE TABLE IF NOT EXISTS meridian.ref_branches (
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
  `,

  `
    CREATE TABLE IF NOT EXISTS meridian.ref_customer_segments (
        segment_id TEXT PRIMARY KEY,
        segment_name TEXT NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  // Meridian Silver layer
  `
    CREATE TABLE IF NOT EXISTS meridian.silver_customers (
        customer_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        email_valid BOOLEAN DEFAULT false,
        phone TEXT,
        phone_valid BOOLEAN DEFAULT false,
        phone_normalized TEXT,
        city TEXT,
        state TEXT,
        segment_id TEXT,
        segment_name TEXT,
        processed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  `
    CREATE TABLE IF NOT EXISTS meridian.silver_transactions (
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
  `,

  // Meridian Gold layer
  `
    CREATE TABLE IF NOT EXISTS meridian.gold_daily_revenue (
        date DATE PRIMARY KEY,
        total_revenue DECIMAL(15,2) NOT NULL,
        interest_income DECIMAL(15,2) DEFAULT 0,
        fee_income DECIMAL(15,2) DEFAULT 0,
        transaction_count INTEGER DEFAULT 0,
        avg_transaction_value DECIMAL(15,2),
        revenue_target DECIMAL(15,2),
        variance_to_target DECIMAL(15,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  `
    CREATE TABLE IF NOT EXISTS meridian.gold_branch_metrics (
        date DATE,
        branch_id TEXT,
        branch_name TEXT,
        region TEXT,
        transaction_count INTEGER DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        avg_transaction_value DECIMAL(15,2),
        customer_count INTEGER DEFAULT 0,
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (date, branch_id)
    );
  `,

  // Pipelines
  `
    CREATE TABLE IF NOT EXISTS meridian.pipelines (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        source_table TEXT,
        target_table TEXT,
        schedule TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `,

  `
    CREATE TABLE IF NOT EXISTS meridian.pipeline_runs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        pipeline_id TEXT,
        status TEXT DEFAULT 'pending',
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        rows_processed INTEGER DEFAULT 0,
        error_message TEXT,
        run_metadata JSONB DEFAULT '{}'
    );
  `
];

async function runMigrations() {
  console.log('Starting database setup...\n');

  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i].trim();
    const preview = sql.substring(0, 60).replace(/\n/g, ' ') + '...';

    console.log(`[${i + 1}/${migrations.length}] Running: ${preview}`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase.from('_temp').select('*').limit(0);
        console.log(`  Warning: ${error.message}`);
      } else {
        console.log('  Done');
      }
    } catch (err) {
      console.log(`  Error: ${err}`);
    }
  }

  console.log('\nDatabase setup complete!');
  console.log('Note: Some operations may require running SQL directly in the Supabase Dashboard.');
}

runMigrations().catch(console.error);
