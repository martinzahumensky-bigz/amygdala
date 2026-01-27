import { NextResponse } from 'next/server';
import { getDocumentaristAgent } from '@/lib/agents/documentarist';
import type { AgentContext } from '@/lib/agents/base';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode = 'full_scan', targetSchema = 'meridian', assetId } = body as {
      mode?: 'full_scan' | 'incremental' | 'single_asset';
      targetSchema?: string;
      assetId?: string;
    };

    const context: AgentContext = {
      parameters: {
        mode,
        targetSchema,
        assetId,
      },
    };

    const agent = getDocumentaristAgent();
    const result = await agent.run(context);

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      stats: result.stats,
      issuesCreated: result.issuesCreated,
      errors: result.errors,
      duration: result.duration,
      mode,
      targetSchema,
    });
  } catch (error) {
    console.error('Documentarist run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Documentarist Agent API',
    usage: 'POST /api/agents/documentarist/run',
    parameters: {
      mode: 'full_scan | incremental | single_asset (default: full_scan)',
      targetSchema: 'Schema to scan (default: meridian)',
      assetId: 'Specific asset ID for single_asset mode',
    },
  });
}
