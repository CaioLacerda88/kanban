'use client';

import { useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string, refreshBoard: () => void) => Promise<void>;
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (text: string, refreshBoard: () => void) => {
      const history = messages; // capture before state update
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      setIsLoading(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
        });

        if (!res.ok) throw new Error('AI request failed');

        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);

        if (data.board_updated) {
          refreshBoard();
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  return { messages, isLoading, sendMessage };
}
