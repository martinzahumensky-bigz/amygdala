import { NextResponse } from 'next/server';
import { getDebuggerAgent } from '@/lib/agents/debugger';
import type { AgentContext } from '@/lib/agents/base';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { issueId } = body as { issueId?: string };

    if (!issueId) {
      return NextResponse.json(
        { error: 'issueId is required' },
        { status: 400 }
      );
    }

    const context: AgentContext = {
      parameters: {
        issueId,
      },
    };

    const agent = getDebuggerAgent();
    const result = await agent.run(context);

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      stats: result.stats,
      errors: result.errors,
      duration: result.duration,
      issueId,
    });
  } catch (error) {
    console.error('Debugger analyze error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debugger Agent Analyze API',
    usage: 'POST /api/agents/debugger/analyze',
    parameters: {
      issueId: 'ID of the issue to analyze (required)',
    },
  });
}
