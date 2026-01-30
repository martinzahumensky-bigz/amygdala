import { NextResponse } from 'next/server';
import { getTransformationAgent, TransformationRequest } from '@/lib/agents';

// POST /api/agents/transformation/plan - Create a new transformation plan
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['targetAsset', 'transformationType', 'description', 'requestedBy'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const transformationRequest: TransformationRequest = {
      sourceType: body.sourceType || 'manual',
      sourceId: body.sourceId,
      targetAsset: body.targetAsset,
      targetColumn: body.targetColumn,
      transformationType: body.transformationType,
      description: body.description,
      parameters: body.parameters || {},
      requestedBy: body.requestedBy,
      accuracyThreshold: body.accuracyThreshold,
      maxIterations: body.maxIterations,
    };

    const agent = getTransformationAgent();
    const plan = await agent.createTransformationPlan(transformationRequest);

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('Create transformation plan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
