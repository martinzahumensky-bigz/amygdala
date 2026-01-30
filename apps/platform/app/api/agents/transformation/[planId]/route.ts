import { NextResponse } from 'next/server';
import { getTransformationAgent } from '@/lib/agents';

// GET /api/agents/transformation/[planId] - Get plan preview
export async function GET(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const agent = getTransformationAgent();
    const preview = await agent.getPreview(planId);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error('Get transformation preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/agents/transformation/[planId] - Approve, reject, or execute
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const { action, reviewedBy, comment, executedBy } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required (approve, reject, execute)' }, { status: 400 });
    }

    const agent = getTransformationAgent();

    switch (action) {
      case 'approve':
        if (!reviewedBy) {
          return NextResponse.json({ error: 'reviewedBy is required for approval' }, { status: 400 });
        }
        await agent.approveTransformation(planId, reviewedBy, comment);
        return NextResponse.json({ success: true, message: 'Transformation approved' });

      case 'reject':
        if (!reviewedBy) {
          return NextResponse.json({ error: 'reviewedBy is required for rejection' }, { status: 400 });
        }
        if (!comment) {
          return NextResponse.json({ error: 'Reason (comment) is required for rejection' }, { status: 400 });
        }
        await agent.rejectTransformation(planId, reviewedBy, comment);
        return NextResponse.json({ success: true, message: 'Transformation rejected' });

      case 'execute':
        if (!executedBy) {
          return NextResponse.json({ error: 'executedBy is required for execution' }, { status: 400 });
        }
        const logId = await agent.executeTransformation(planId, executedBy);
        return NextResponse.json({ success: true, logId, message: 'Transformation executed' });

      case 'request_approval':
        const approvalId = await agent.requestApproval(planId);
        return NextResponse.json({ success: true, approvalId, message: 'Approval requested' });

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Transformation action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
