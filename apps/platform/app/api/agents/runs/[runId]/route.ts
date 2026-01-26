import { NextResponse } from 'next/server';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const supabase = getAmygdalaClient();

    // Get the run details
    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError) {
      return NextResponse.json(
        { error: `Run not found: ${runError.message}` },
        { status: 404 }
      );
    }

    // Get logs for this run
    const { data: logs, error: logsError } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('run_id', runId)
      .order('timestamp', { ascending: true });

    if (logsError) {
      console.error('Failed to fetch logs:', logsError);
    }

    // Get issues created during this run
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, title, severity, issue_type, status, created_at')
      .eq('created_by', run.agent_name)
      .gte('created_at', run.started_at)
      .lte('created_at', run.completed_at || new Date().toISOString());

    if (issuesError) {
      console.error('Failed to fetch issues:', issuesError);
    }

    return NextResponse.json({
      run,
      logs: logs || [],
      issues: issues || [],
    });
  } catch (error) {
    console.error('Run details error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
