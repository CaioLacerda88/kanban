'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
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
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI chat"
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-primary dark:bg-sky-600 text-white flex items-center justify-center shadow-lg hover:opacity-90 hover:scale-105 transition-all"
        >
          <Sparkles size={20} />
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <aside className="fixed top-0 right-0 h-full w-80 bg-slate-900 dark:bg-slate-950 border-l border-slate-700/60 flex flex-col z-40 shadow-2xl">
          <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-sky-400" />
              <h2 className="text-white font-semibold text-sm">AI Assistant</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close AI chat"
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-slate-500 text-xs text-center mt-4 leading-relaxed">
                Ask me to add, move, or update cards on your board.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm rounded-xl px-3 py-2.5 max-w-[88%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-600/30 text-white ml-auto'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-slate-800 text-slate-400 text-sm rounded-xl px-3 py-2.5 max-w-[88%] animate-pulse">
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700/60 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your board..."
              rows={2}
              disabled={isLoading}
              aria-label="Message input"
              className="flex-1 bg-slate-800 text-white text-sm rounded-lg px-3 py-2 resize-none placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50 border border-slate-700/60"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="bg-accent-yellow text-slate-900 text-sm font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity self-end flex items-center gap-1.5"
            >
              <Send size={14} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
