import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

// GET /api/agents/transformation/history - Get transformation history
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = getAmygdalaClient();

    // Build query for plans
    let plansQuery = supabase
      .from('transformation_plans')
      .select(`
        *,
        approvals:transformation_approvals(*),
        logs:transformation_logs(*),
        iterations:transformation_iterations(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (asset) {
      plansQuery = plansQuery.eq('target_asset', asset);
    }

    if (status) {
      plansQuery = plansQuery.eq('status', status);
    }

    const { data: plans, error } = await plansQuery;

    if (error) {
      console.error('Error fetching transformation history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary stats
    const { data: statsData } = await supabase
      .from('transformation_plans')
      .select('status');

    const stats = {
      total: statsData?.length || 0,
      pending: statsData?.filter(p => p.status === 'pending_approval').length || 0,
      completed: statsData?.filter(p => p.status === 'completed').length || 0,
      failed: statsData?.filter(p => p.status === 'failed').length || 0,
      iterating: statsData?.filter(p => p.status === 'iterating').length || 0,
    };

    return NextResponse.json({
      success: true,
      plans: plans || [],
      stats,
    });
  } catch (error) {
    console.error('Transformation history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
