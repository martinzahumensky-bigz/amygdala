import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch daily revenue
    const { data: revenueData, error: revenueError } = await supabase
      .from('gold_daily_revenue')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (revenueError) {
      console.error('Revenue fetch error:', revenueError);
      return NextResponse.json({ error: revenueError.message }, { status: 500 });
    }

    // Get branch data for the latest date
    let branchData: any[] = [];
    if (revenueData && revenueData.length > 0) {
      const latestDate = revenueData[0].date;

      const { data: branchResult, error: branchError } = await supabase
        .from('gold_branch_metrics')
        .select('*')
        .eq('date', latestDate)
        .order('total_amount', { ascending: false });

      if (branchError) {
        console.error('Branch fetch error:', branchError);
      } else {
        branchData = branchResult || [];
      }
    }

    return NextResponse.json({
      revenue: revenueData || [],
      branches: branchData
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
