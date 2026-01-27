'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat, getContextSuggestions } from '@/contexts/ChatContext';
import { Button } from '@amygdala/ui';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Database,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatDrawer() {
  const { isOpen, context, closeChat } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `drawer-${Date.now()}`);
  const [isWide, setIsWide] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get suggestions based on context
  const suggestions = getContextSuggestions(context);

  // Auto-fill prompt when context changes and auto-send if prefilled
  useEffect(() => {
    if (context && context.prefilledPrompt) {
      setInput(context.prefilledPrompt);
      // Auto-send prefilled prompts for "Fix with AI" actions
      if (context.autoSend) {
        setAutoSend(true);
      }
    }
  }, [context]);

  // Auto-send when marked
  useEffect(() => {
    if (autoSend && input && !isLoading && messages.length === 0) {
      sendMessage(input);
      setAutoSend(false);
    }
  }, [autoSend, input, isLoading, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen && !context?.autoSend) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, context?.autoSend]);

  // Reset messages when context changes
  useEffect(() => {
    if (context) {
      setMessages([]);
    }
  }, [context?.id, context?.type]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const contextInfo = context
        ? {
            type: context.type,
            id: context.id,
            title: context.title,
          }
        : undefined;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          sessionId,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: contextInfo,
        }),
      });

      const data = await response.json();

      // Check for error in response
      if (!response.ok || data.error) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message || data.error || `Error: ${response.statusText}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'I received your message but had trouble processing it.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered a network error. Please check your connection and try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const getContextIcon = () => {
    switch (context?.type) {
      case 'issue':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'asset':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContextLabel = () => {
    switch (context?.type) {
      case 'issue':
        return 'Fixing issue';
      case 'asset':
        return 'Improving asset';
      case 'recommendation':
        return 'Implementing fix';
      default:
        return 'General chat';
    }
  };

  if (!isOpen) return null;

  const drawerWidth = isWide ? 'w-[600px] max-w-[80vw]' : 'w-[420px] max-w-[90vw]';

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={closeChat}
      />

      {/* Right Side Drawer */}
      <div
        className={`fixed top-0 right-0 h-full ${drawerWidth} bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-200 dark:border-gray-700`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
              {context && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {getContextIcon()}
                  <span>{getContextLabel()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsWide(!isWide)}
              className="h-8 w-8 p-0"
              title={isWide ? 'Narrow drawer' : 'Widen drawer'}
            >
              {isWide ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={closeChat} className="h-8 w-8 p-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Context Banner */}
        {context && context.title && (
          <div className="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/50">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <span className="font-medium">{context.title}</span>
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto text-purple-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {context?.prefilledPrompt ? 'Ready to help!' : 'How can I help?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                {context?.prefilledPrompt
                  ? 'Press Enter or click Send to get started with your request.'
                  : 'Ask me about data quality, issues, or get help with your assets.'}
              </p>
              {!context?.prefilledPrompt && (
                <div className="space-y-2 max-w-sm mx-auto">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(suggestion)}
                      className="block w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={context?.prefilledPrompt ? "Press Enter to send..." : "Type your message..."}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="h-11 px-4 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
