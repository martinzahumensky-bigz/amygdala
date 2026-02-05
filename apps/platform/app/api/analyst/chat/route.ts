import { NextRequest, NextResponse } from 'next/server';
import { getAnalystAgent, AnalystChatMessage } from '@/lib/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history } = body as {
      message: string;
      history?: AnalystChatMessage[];
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const analyst = getAnalystAgent();
    const response = await analyst.chat(message, history);

    return NextResponse.json({
      message: response.message,
      recommendations: response.recommendations,
      toolsUsed: response.toolsUsed,
      suggestions: response.suggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Analyst chat error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        message: 'I encountered an error connecting to Ataccama. Please try again.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    agent: 'Analyst',
    description: 'Helps find reliable data tables using Ataccama MCP',
    suggestedPrompts: [
      'Find me customer tables for churn analysis',
      'What revenue data is available with good quality?',
      'Show me tables from Snowflake with high DQ scores',
      'I need transaction data for fraud detection',
    ],
  });
}
