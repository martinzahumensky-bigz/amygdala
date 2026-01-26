import { NextResponse } from 'next/server';
import { getAgent, AgentName, AgentContext } from '@/lib/agents';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent: agentName, context } = body as { agent: AgentName; context?: AgentContext };

    if (!agentName) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    // Get the agent instance
    const agent = getAgent(agentName);

    // Run the agent
    const result = await agent.run(context);

    return NextResponse.json({
      success: result.success,
      runId: result.runId,
      stats: result.stats,
      issuesCreated: result.issuesCreated,
      errors: result.errors,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Agent run error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
