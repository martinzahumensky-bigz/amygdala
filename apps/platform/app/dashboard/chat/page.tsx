'use client';

import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { Card, Button, Badge } from '@amygdala/ui';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Eye,
  Wrench,
  CheckCircle,
  RefreshCw,
  Star,
  AlertTriangle,
  Database,
  Shield,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentName?: string;
  action?: {
    type: string;
    details?: Record<string, any>;
  };
}

const agentIcons: Record<string, any> = {
  orchestrator: Sparkles,
  spotter: Eye,
  debugger: Wrench,
  quality: CheckCircle,
  transformation: RefreshCw,
  trust: Star,
};

const suggestedPrompts = [
  { text: 'What can you help me with?', icon: MessageSquare },
  { text: 'Run a data quality scan', icon: Eye },
  { text: 'Show me the current issues', icon: AlertTriangle },
  { text: 'What is the trust index?', icon: Shield },
  { text: 'Help me understand my data quality', icon: Database },
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const AgentIcon = message.agentName ? agentIcons[message.agentName] || Bot : Bot;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <AgentIcon className="h-4 w-4" />}
      </div>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isUser ? 'You' : message.agentName || 'Agent'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
            {message.content.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {line}
              </p>
            ))}
          </div>
        </div>
        {message.action && message.action.type !== 'none' && (
          <div className="mt-2">
            {message.action.type === 'run_agent' && (
              <Badge variant="success" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Running {message.action.details?.agent} agent...
              </Badge>
            )}
            {message.action.type === 'show_data' && (
              <Link
                href={`/dashboard/${message.action.details?.view}`}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline dark:text-primary-400"
              >
                View {message.action.details?.view}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Generate a session ID
    setSessionId(`session-${Date.now()}`);

    // Add welcome message
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm the Amygdala Orchestrator Agent. I can help you with:

• **Data Quality** - Run scans and analyze issues
• **Trust Index** - Understand your data trust scores
• **Issues** - View and manage data quality issues
• **Catalog** - Browse your data assets

How can I assist you today?`,
        timestamp: new Date().toISOString(),
        agentName: 'orchestrator',
      },
    ]);

    setSuggestions([
      'Run a data quality scan',
      'Show me current issues',
      'What is the trust index?',
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          sessionId,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I apologize, I could not process your request.',
        timestamp: data.timestamp || new Date().toISOString(),
        agentName: data.agentUsed || 'orchestrator',
        action: data.action,
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
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          agentName: 'orchestrator',
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
    setSessionId(`session-${Date.now()}`);
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: 'Chat cleared. How can I help you?',
        timestamp: new Date().toISOString(),
        agentName: 'orchestrator',
      },
    ]);
  };

  return (
    <>
      <Header
        title="Agent Chat"
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <Button variant="outline" size="sm" onClick={clearChat}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            New Chat
          </Button>
        }
      />

      <main className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div className="px-6 pb-4">
            <div className="max-w-3xl mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Suggested prompts:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <prompt.icon className="h-4 w-4 text-gray-400" />
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick suggestions from API */}
        {messages.length > 2 && suggestions.length > 0 && (
          <div className="px-6 pb-2">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
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
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything about your data..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  style={{ maxHeight: '200px' }}
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="h-11 w-11 rounded-xl p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
              Powered by Claude • Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
