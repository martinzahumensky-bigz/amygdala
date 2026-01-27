import { NextResponse } from 'next/server';
import { getOperatorAgent, OperationRequest } from '@/lib/agents/operator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, confirmed, preview } = body as {
      operation: OperationRequest;
      confirmed?: boolean;
      preview?: boolean;
    };

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation is required' },
        { status: 400 }
      );
    }

    if (!operation.type || !operation.targetId || !operation.targetType) {
      return NextResponse.json(
        { error: 'Operation must include type, targetId, and targetType' },
        { status: 400 }
      );
    }

    const operator = getOperatorAgent();

    // Preview mode - show what would happen without executing
    if (preview) {
      const previewResult = await operator.previewOperation(operation);
      return NextResponse.json({
        preview: true,
        ...previewResult,
      });
    }

    // Execute with confirmation check
    if (confirmed === false) {
      return NextResponse.json({
        executed: false,
        message: 'Operation was not confirmed',
        operation: operation.type,
      });
    }

    // Execute the operation
    const result = await operator.executeWithConfirmation(operation, confirmed !== false);

    return NextResponse.json({
      executed: true,
      ...result,
    });
  } catch (error) {
    console.error('Operator execute error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check operator status
export async function GET() {
  try {
    const operator = getOperatorAgent();
    const recentRuns = await operator.getRecentRuns(5);
    const recentLogs = await operator.getRecentLogs(10);

    return NextResponse.json({
      agent: 'Operator',
      status: operator.getStatus(),
      recentRuns,
      recentLogs,
    });
  } catch (error) {
    console.error('Operator status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
