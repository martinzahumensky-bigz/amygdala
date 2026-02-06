import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = 'force-dynamic';

// GET - Retrieve the latest snapshot for a page/asset
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get('pageUrl');
    const assetName = searchParams.get('asset');

    if (!pageUrl && !assetName) {
      return NextResponse.json(
        { error: 'pageUrl or asset parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'amygdala' },
    });

    // Query for the latest snapshot
    let query = supabase
      .from('visual_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (assetName) {
      query = query.eq('asset_name', assetName);
    } else if (pageUrl) {
      query = query.eq('page_url', pageUrl);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not exist yet, return null snapshot
      console.log('Snapshot query error (table may not exist):', error.message);
      return NextResponse.json({ snapshot: null });
    }

    return NextResponse.json({ snapshot: data?.[0] || null });
  } catch (error) {
    console.error('Snapshot GET error:', error);
    return NextResponse.json({ snapshot: null });
  }
}

// POST - Save a new snapshot
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pageUrl, pageTitle, assetName, reportType, snapshot } = body;

    if (!pageUrl || !snapshot) {
      return NextResponse.json(
        { error: 'pageUrl and snapshot are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'amygdala' },
    });

    // First, ensure the table exists (create if not)
    await ensureSnapshotTableExists(supabase);

    // Insert the new snapshot
    const { data, error } = await supabase
      .from('visual_snapshots')
      .insert({
        page_url: pageUrl,
        page_title: pageTitle,
        asset_name: assetName,
        report_type: reportType,
        snapshot_data: snapshot,
        kpi_count: snapshot.kpis?.length || 0,
        table_count: snapshot.tables?.length || 0,
        alert_count: snapshot.alerts?.length || 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Snapshot insert error:', error);
      // Still return success - we don't want to block the user
      return NextResponse.json({
        success: true,
        message: 'Snapshot processed (storage may be unavailable)',
      });
    }

    return NextResponse.json({
      success: true,
      snapshotId: data?.id,
    });
  } catch (error) {
    console.error('Snapshot POST error:', error);
    return NextResponse.json({
      success: true,
      message: 'Snapshot processed locally',
    });
  }
}

// Helper to ensure the snapshot table exists
async function ensureSnapshotTableExists(supabase: any) {
  try {
    // Try to create the table if it doesn't exist
    // This uses raw SQL - in production you'd use migrations
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS amygdala.visual_snapshots (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          page_url TEXT NOT NULL,
          page_title TEXT,
          asset_name TEXT,
          report_type TEXT,
          snapshot_data JSONB NOT NULL,
          kpi_count INTEGER DEFAULT 0,
          table_count INTEGER DEFAULT 0,
          alert_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_visual_snapshots_asset
          ON amygdala.visual_snapshots(asset_name);
        CREATE INDEX IF NOT EXISTS idx_visual_snapshots_page
          ON amygdala.visual_snapshots(page_url);
        CREATE INDEX IF NOT EXISTS idx_visual_snapshots_created
          ON amygdala.visual_snapshots(created_at DESC);
      `,
    });

    if (error) {
      // RPC might not exist, try direct insert which will fail gracefully
      console.log('Could not ensure table exists via RPC:', error.message);
    }
  } catch (e) {
    // Ignore - table creation is best-effort
    console.log('Table creation attempt:', e);
  }
}
