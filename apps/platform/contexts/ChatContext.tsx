'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ChatOpenOptions {
  type: 'issue' | 'asset' | 'recommendation' | 'general';
  id?: string;
  prefilledPrompt?: string;
  title?: string;
}

interface ChatContextValue {
  isOpen: boolean;
  context: ChatOpenOptions | null;
  openChat: (options?: ChatOpenOptions) => void;
  closeChat: () => void;
  setContext: (context: ChatOpenOptions | null) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ChatOpenOptions | null>(null);

  const openChat = useCallback((options?: ChatOpenOptions) => {
    if (options) {
      setContext(options);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // Don't clear context immediately to allow for animations
    setTimeout(() => setContext(null), 300);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        context,
        openChat,
        closeChat,
        setContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Helper to generate pre-filled prompts based on context
export function generateContextPrompt(options: ChatOpenOptions): string {
  switch (options.type) {
    case 'issue':
      if (options.prefilledPrompt) return options.prefilledPrompt;
      return `Help me understand and resolve this issue: ${options.title || 'the selected issue'}`;
    case 'asset':
      if (options.prefilledPrompt) return options.prefilledPrompt;
      return `Tell me about the data asset: ${options.title || 'the selected asset'}`;
    case 'recommendation':
      return options.prefilledPrompt || 'How can I improve this?';
    default:
      return options.prefilledPrompt || '';
  }
}

// Helper to generate suggested prompts based on context
export function getContextSuggestions(options: ChatOpenOptions | null): string[] {
  if (!options) {
    return [
      'What is the overall health of our data?',
      'Show me recent data quality issues',
      'Which assets need attention?',
      'Run a quality check on our data',
    ];
  }

  switch (options.type) {
    case 'issue':
      return [
        'What caused this issue?',
        'How can I fix this issue?',
        'What assets are affected?',
        'Show similar issues',
      ];
    case 'asset':
      return [
        'How can I improve trust score?',
        'What issues affect this asset?',
        'Show data lineage',
        'Generate quality rules',
      ];
    case 'recommendation':
      return [
        'Explain this recommendation',
        'How do I implement this?',
        'What is the impact?',
        'Are there alternatives?',
      ];
    default:
      return [
        'Show me data quality metrics',
        'What needs attention?',
        'Run Spotter agent',
        'Generate a report',
      ];
  }
}
