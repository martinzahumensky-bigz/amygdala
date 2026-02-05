'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Card, Button, Badge } from '@amygdala/ui';
import {
  BarChart3,
  Send,
  Loader2,
  Bot,
  User,
  Search,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Sparkles,
  Table2,
  Shield,
  TrendingUp,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  recommendations?: TableRecommendation[];
}

interface TableRecommendation {
  name: string;
  id: string;
  source: string;
  dqScore?: number;
  dqStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  owner?: string;
  description?: string;
  recommendation: 'recommended' | 'alternative' | 'not_recommended';
  reasons: string[];
}

const suggestedPrompts = [
  {
    text: 'Find customer tables for churn analysis',
    icon: Search,
    category: 'Customer',
  },
  {
    text: 'What revenue data has the best quality?',
    icon: TrendingUp,
    category: 'Revenue',
  },
  {
    text: 'Show me Snowflake tables with high DQ scores',
    icon: Database,
    category: 'Source',
  },
  {
    text: 'I need transaction data for fraud detection',
    icon: Shield,
    category: 'Security',
  },
];

const statusColors = {
  excellent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  good: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  poor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const recommendationIcons = {
  recommended: CheckCircle2,
  alternative: AlertTriangle,
  not_recommended: XCircle,
};

const recommendationColors = {
  recommended: 'text-green-600 dark:text-green-400',
  alternative: 'text-yellow-600 dark:text-yellow-400',
  not_recommended: 'text-red-600 dark:text-red-400',
};

function RecommendationCard({ rec }: { rec: TableRecommendation }) {
  const Icon = recommendationIcons[rec.recommendation];
  const colorClass = recommendationColors[rec.recommendation];

  return (
    <Card className="p-4 border-l-4 border-l-primary-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {rec.name}
              </h4>
              <Badge className={statusColors[rec.dqStatus]}>
                {rec.dqScore !== undefined ? `${rec.dqScore}%` : rec.dqStatus}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {rec.source}
            </p>
            {rec.owner && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Owner: {rec.owner}
              </p>
            )}
            {rec.reasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rec.reasons.map((reason, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
      </div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isUser ? 'You' : 'Analyst Agent'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap">
            {message.content.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </p>
            ))}
          </div>
        </div>

        {/* Tool usage indicator */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-3 w-3 text-cyan-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Used: {message.toolsUsed.join(', ')}
            </span>
          </div>
        )}

        {/* Recommendations */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-3 space-y-2 w-full">
            {message.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalystPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Hi! I'm the **Analyst Agent** powered by Ataccama MCP.

I help you find the most reliable data tables for your analytical work by:

• **Searching** Ataccama's data catalog
• **Evaluating** data quality scores
• **Recommending** the best tables with reasoning

What kind of data are you looking for today?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I could not process your request.',
        timestamp: data.timestamp || new Date().toISOString(),
        toolsUsed: data.toolsUsed,
        recommendations: data.recommendations,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error connecting to Ataccama. Please make sure the MCP server is running and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: 'Chat cleared. What data are you looking for?',
        timestamp: new Date().toISOString(),
      },
    ]);
    setSuggestions([]);
  };

  return (
    <>
      <Header
        title="Analyst Agent"
        subtitle="Find reliable data with Ataccama MCP"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-cyan-600 border-cyan-300 dark:text-cyan-400 dark:border-cyan-700">
              <Database className="h-3 w-3 mr-1" />
              Ataccama MCP
            </Badge>
            <Button variant="outline" size="sm" onClick={clearChat}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              New Chat
            </Button>
          </div>
        }
      />

      <main className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching Ataccama catalog...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="px-6 pb-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Try asking:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    disabled={isLoading}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <prompt.icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-medium">{prompt.text}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{prompt.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions from API */}
        {messages.length > 2 && suggestions.length > 0 && (
          <div className="px-6 pb-2">
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the data you need for your analysis..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  style={{ maxHeight: '200px' }}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-11 w-11 rounded-xl p-0 bg-cyan-600 hover:bg-cyan-700"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
              Powered by Claude + Ataccama MCP • Press Enter to send
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
