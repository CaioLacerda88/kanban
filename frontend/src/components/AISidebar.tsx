'use client';

import { useEffect, useRef, useState } from 'react';
import { useAIChat } from '@/hooks/useAIChat';

interface Props {
  refreshBoard: () => void;
}

export default function AISidebar({ refreshBoard }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text, refreshBoard);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button — only shown when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-primary text-white flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity text-lg"
        >
          ✦
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <aside className="fixed top-0 right-0 h-full w-80 bg-dark-navy border-l border-white/10 flex flex-col z-40 shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">AI Assistant</h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close AI chat"
              className="text-white/60 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-text text-xs text-center mt-4">
                Ask me to add, move, or update cards on your board.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-primary/20 text-white ml-auto'
                    : 'bg-white/5 text-white/80'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-white/5 text-white/50 text-sm rounded-lg px-3 py-2 max-w-[85%] animate-pulse">
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your board…"
              rows={2}
              disabled={isLoading}
              aria-label="Message input"
              className="flex-1 bg-white/5 text-white text-sm rounded px-3 py-2 resize-none placeholder:text-gray-text focus:outline-none focus:ring-1 focus:ring-blue-primary disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="bg-accent-yellow text-dark-navy text-sm font-semibold px-3 py-2 rounded hover:opacity-90 disabled:opacity-40 transition-opacity self-end"
            >
              Send
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
