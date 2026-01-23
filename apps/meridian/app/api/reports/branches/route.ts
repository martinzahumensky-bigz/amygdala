import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Get latest date from metrics
    const { data: latestData, error: latestError } = await supabase
      .from('gold_branch_metrics')
      .select('date')
      .order('date', { ascending: false })
      .limit(1);

    if (latestError) {
      console.error('Latest date fetch error:', latestError);
      return NextResponse.json({ error: latestError.message }, { status: 500 });
    }

    let metrics: any[] = [];
    if (latestData && latestData.length > 0) {
      const latestDate = latestData[0].date;

      const { data: metricsData, error: metricsError } = await supabase
        .from('gold_branch_metrics')
        .select('*')
        .eq('date', latestDate)
        .order('total_amount', { ascending: false });

      if (metricsError) {
        console.error('Metrics fetch error:', metricsError);
        return NextResponse.json({ error: metricsError.message }, { status: 500 });
      }

      metrics = metricsData || [];
    }

    // Get branch reference data
    const { data: branchData, error: branchError } = await supabase
      .from('ref_branches')
      .select('*');

    if (branchError) {
      console.error('Branch ref fetch error:', branchError);
    }

    return NextResponse.json({
      metrics,
      branches: branchData || [],
      latestDate: latestData?.[0]?.date || null
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
