import { NextResponse } from 'next/server';
import { getOrchestratorAgent, ChatMessage, ChatContext } from '@/lib/agents/orchestrator';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const orchestrator = getOrchestratorAgent();

    // Build context
    const context: ChatContext = {
      messages: history as ChatMessage[],
      sessionId: sessionId || `session-${Date.now()}`,
    };

    // Process the message
    const response = await orchestrator.processMessage(message, context);

    // Store the conversation in database (optional)
    const supabase = getAmygdalaClient();

    // Log the chat interaction
    await supabase.from('agent_logs').insert({
      agent_name: 'orchestrator',
      action: 'chat_message',
      summary: `User: ${message.substring(0, 100)}...`,
      details: {
        userMessage: message,
        response: response.message.substring(0, 500),
        action: response.action,
        sessionId: context.sessionId,
      },
    });

    return NextResponse.json({
      message: response.message,
      agentUsed: response.agentUsed,
      action: response.action,
      suggestions: response.suggestions,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({
        message: 'Welcome to Amygdala Agent Chat',
        suggestions: [
          'What can you help me with?',
          'Run a data quality scan',
          'Show me the current issues',
        ],
      });
    }

    // Fetch conversation history from logs
    const supabase = getAmygdalaClient();
    const { data: logs } = await supabase
      .from('agent_logs')
      .select('*')
      .eq('agent_name', 'orchestrator')
      .eq('action', 'chat_message')
      .contains('details', { sessionId })
      .order('timestamp', { ascending: true })
      .limit(50);

    const history: ChatMessage[] = [];

    if (logs) {
      for (const log of logs) {
        if (log.details?.userMessage) {
          history.push({
            role: 'user',
            content: log.details.userMessage,
            timestamp: log.timestamp,
          });
        }
        if (log.details?.response) {
          history.push({
            role: 'assistant',
            content: log.details.response,
            timestamp: log.timestamp,
            agentName: 'orchestrator',
          });
        }
      }
    }

    return NextResponse.json({
      sessionId,
      history,
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
