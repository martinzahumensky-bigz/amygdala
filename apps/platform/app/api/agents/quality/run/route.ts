import { NextResponse } from 'next/server';
import { getQualityAgent, QualityAgentRunContext } from '@/lib/agents/quality';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, targetAssets, generateForNewAssets } = body as QualityAgentRunContext;

    const qualityAgent = getQualityAgent();

    const result = await qualityAgent.run({
      mode: mode || 'both',
      targetAssets,
      generateForNewAssets,
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
    console.error('Quality agent run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const qualityAgent = getQualityAgent();
    const recentRuns = await qualityAgent.getRecentRuns(5);
    const recentLogs = await qualityAgent.getRecentLogs(10);

    return NextResponse.json({
      agent: 'Quality',
      status: qualityAgent.getStatus(),
      recentRuns,
      recentLogs,
    });
  } catch (error) {
    console.error('Quality agent status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
