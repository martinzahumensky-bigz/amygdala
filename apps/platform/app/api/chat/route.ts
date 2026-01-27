import { NextResponse } from 'next/server';
import { getOrchestratorAgent, ChatMessage, ChatContext } from '@/lib/agents/orchestrator';
import { getAmygdalaClient } from '@/lib/supabase/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, sessionId, history = [], context: entityContext } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const orchestrator = getOrchestratorAgent();

    // Build context with optional entity context (issue/asset)
    const context: ChatContext = {
      messages: history as ChatMessage[],
      sessionId: sessionId || `session-${Date.now()}`,
      entityContext: entityContext as { type: string; id?: string; title?: string } | undefined,
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

    // Check if it's an Anthropic API error
    let errorMessage = 'Unknown error';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types
      if (errorMessage.includes('401') || errorMessage.includes('API key')) {
        errorMessage = 'AI service authentication failed. Please check the API configuration.';
        statusCode = 401;
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = 'AI service rate limit reached. Please try again in a moment.';
        statusCode = 429;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        message: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      },
      { status: statusCode }
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
