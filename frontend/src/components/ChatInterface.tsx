import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../hooks/useChat';
import { SourcePanel } from './SourcePanel';
import { ConflictAlert } from './ConflictAlert';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  currentStage?: string;
  onSend: (question: string) => void;
}

export const ChatInterface: React.FC<Props> = ({ messages, isLoading, currentStage, onSend }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput('');
    onSend(q);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-fuchsia-500 opacity-20 blur-[40px] rounded-full group-hover:opacity-40 transition-opacity duration-1000 animate-pulse" />
              <div className="absolute inset-2 bg-violet-500/30 blur-2xl rounded-full mix-blend-screen" />
              <div className="text-6xl relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500">🧠</div>
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-zinc-100 font-bold text-2xl tracking-tight">Ask your documents anything</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Upload a PDF or DOCX, then ask technical questions. Get verified answers with precise source citations.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`} style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
              {/* Conflict alert above assistant message */}
              {msg.role === 'assistant' && msg.response?.conflicts && msg.response.conflicts.length > 0 && (
                <ConflictAlert conflicts={msg.response.conflicts} />
              )}

              <div
                className={`
                  relative rounded-2xl px-5 py-4 text-[15px] leading-relaxed shadow-sm transition-all duration-300
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-tr-sm shadow-xl shadow-violet-900/30 whitespace-pre-wrap ring-1 ring-white/10'
                    : 'bg-zinc-900/70 backdrop-blur-2xl text-zinc-200 rounded-tl-sm border border-white/5 shadow-2xl shadow-black/40 ring-1 ring-white/5 hover:border-white/10'
                  }
                `}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="prose-docmind">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Source panel below assistant message */}
              {msg.role === 'assistant' && msg.response?.sources && msg.response.sources.length > 0 && (
                <div className="mt-3">
                  <SourcePanel
                    sources={msg.response.sources}
                    confidence={msg.response.confidence}
                    queryType={msg.response.query_type}
                  />
                </div>
              )}

              <div className={`flex items-center gap-2 mt-1.5 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className="text-zinc-600 text-[11px] font-medium tracking-wide">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.role === 'assistant' && (
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                )}
                {msg.role === 'assistant' && (
                  <span className="text-zinc-500 text-[11px] font-medium tracking-wide">DocMind AI</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-[#18181b]/80 backdrop-blur-md border border-zinc-800/60 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3 shadow-sm shadow-black/20">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-zinc-400 text-sm font-medium tracking-wide">{currentStage || 'Agents reasoning...'}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent relative z-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-2xl p-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/30 focus-within:bg-zinc-900/80 transition-all duration-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question about your documents... (Press Enter)"
              rows={1}
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 text-[15px] leading-relaxed resize-none outline-none px-3 py-2 max-h-40 scrollbar-thin scrollbar-thumb-zinc-700/50"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-11 h-11 bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-violet-500/25 active:scale-95"
            >
              <svg className="w-5 h-5 translate-x-[1px] translate-y-[-1px] rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <p className="text-zinc-500 text-[11px] font-medium tracking-wide uppercase">
              Powered by LangGraph & Hybrid Search
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
