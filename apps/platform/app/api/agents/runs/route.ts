import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getAmygdalaClient();

    // Build the query
    let query = supabase
      .from('agent_runs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agent) {
      query = query.eq('agent_name', agent);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: runs, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch runs: ${error.message}`);
    }

    // Get log counts for each run
    const runsWithLogCounts = await Promise.all(
      (runs || []).map(async (run) => {
        const { count: logCount } = await supabase
          .from('agent_logs')
          .select('*', { count: 'exact', head: true })
          .eq('run_id', run.id);

        return {
          ...run,
          log_count: logCount || 0,
        };
      })
    );

    return NextResponse.json({
      runs: runsWithLogCounts,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Runs list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
