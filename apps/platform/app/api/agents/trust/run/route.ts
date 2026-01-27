import { NextResponse } from 'next/server';
import { getTrustAgent, TrustAgentRunContext } from '@/lib/agents/trust';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { forceRecalculate, thresholds } = body as TrustAgentRunContext;

    const trustAgent = getTrustAgent();

    const result = await trustAgent.run({
      forceRecalculate,
      thresholds,
    });

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      stats: result.stats,
      issuesCreated: result.issuesCreated,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Trust agent run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const trustAgent = getTrustAgent();
    const recentRuns = await trustAgent.getRecentRuns(5);
    const recentLogs = await trustAgent.getRecentLogs(10);

    return NextResponse.json({
      agent: 'Trust',
      status: trustAgent.getStatus(),
      recentRuns,
      recentLogs,
    });
  } catch (error) {
    console.error('Trust agent status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
