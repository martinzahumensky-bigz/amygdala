import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build query
    let query = supabase
      .from('automation_runs')
      .select('*', { count: 'exact' })
      .eq('automation_id', id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: runs, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch runs: ${error.message}`);
    }

    // Calculate stats
    const { data: allRuns } = await supabase
      .from('automation_runs')
      .select('status, duration_ms')
      .eq('automation_id', id);

    const stats = {
      total: allRuns?.length || 0,
      success: allRuns?.filter(r => r.status === 'success').length || 0,
      failed: allRuns?.filter(r => r.status === 'failed').length || 0,
      skipped: allRuns?.filter(r => r.status === 'skipped').length || 0,
      avgDuration: 0,
    };

    const completedRuns = allRuns?.filter(r => r.duration_ms) || [];
    if (completedRuns.length > 0) {
      stats.avgDuration = Math.round(
        completedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedRuns.length
      );
    }

    return NextResponse.json({
      runs: runs || [],
      total: count || 0,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error('Get automation runs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
