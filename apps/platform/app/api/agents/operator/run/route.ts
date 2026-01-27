import { NextResponse } from 'next/server';
import { getOperatorAgent, OperationRequest } from '@/lib/agents/operator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operations, dryRun } = body as {
      operations?: OperationRequest[];
      dryRun?: boolean;
    };

    if (!operations || operations.length === 0) {
      return NextResponse.json(
        { error: 'At least one operation is required' },
        { status: 400 }
      );
    }

    // Validate all operations
    for (const op of operations) {
      if (!op.type || !op.targetId || !op.targetType) {
        return NextResponse.json(
          { error: 'Each operation must include type, targetId, and targetType' },
          { status: 400 }
        );
      }
    }

    const operator = getOperatorAgent();

    const result = await operator.run({
      operations,
      dryRun: dryRun ?? false,
    });

    return NextResponse.json({
      runId: result.runId,
      success: result.success,
      stats: result.stats,
      errors: result.errors,
      duration: result.duration,
      dryRun: dryRun ?? false,
    });
  } catch (error) {
    console.error('Operator run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
