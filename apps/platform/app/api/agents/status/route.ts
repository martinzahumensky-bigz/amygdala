import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';
import { getAvailableAgents } from '@/lib/agents';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agent');

    const supabase = getAmygdalaClient();

    // Get recent runs
    let runsQuery = supabase
      .from('agent_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    if (agentName) {
      runsQuery = runsQuery.eq('agent_name', agentName);
    }

    const { data: runs, error: runsError } = await runsQuery;

    if (runsError) {
      throw new Error(`Failed to fetch runs: ${runsError.message}`);
    }

    // Get recent logs
    let logsQuery = supabase
      .from('agent_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (agentName) {
      logsQuery = logsQuery.eq('agent_name', agentName);
    }

    const { data: logs, error: logsError } = await logsQuery;

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`);
    }

    // Get agent stats
    const agents = getAvailableAgents();
    const agentStats: Record<string, any> = {};

    for (const agent of agents) {
      // Use ilike for case-insensitive matching (handles 'spotter' vs 'Spotter')
      const { data: agentRuns } = await supabase
        .from('agent_runs')
        .select('status')
        .ilike('agent_name', agent);

      const { data: lastRun } = await supabase
        .from('agent_runs')
        .select('*')
        .ilike('agent_name', agent)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      agentStats[agent] = {
        totalRuns: agentRuns?.length || 0,
        successfulRuns: agentRuns?.filter((r) => r.status === 'completed').length || 0,
        failedRuns: agentRuns?.filter((r) => r.status === 'failed').length || 0,
        lastRun: lastRun || null,
        isRunning: lastRun?.status === 'running',
      };
    }

    return NextResponse.json({
      agents: agentStats,
      recentRuns: runs || [],
      recentLogs: logs || [],
    });
  } catch (error) {
    console.error('Agent status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
