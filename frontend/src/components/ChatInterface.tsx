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
              <div className="absolute inset-0 bg-brand-500/20 blur-[60px] rounded-full group-hover:opacity-60 transition-opacity duration-1000 animate-soft-pulse" />
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xl relative z-10 shadow-2xl overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 to-transparent" />
                 <svg className="w-6 h-6 text-brand-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                 </svg>
              </div>
            </div>
            <div className="space-y-3 max-w-md">
              <h2 className="text-zinc-100 font-medium text-xl tracking-wide">DocMind Intelligence</h2>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Connect your documentation stack and query it using a LangGraph-orchestrated reasoning agent.
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
                  relative px-6 py-5 text-[15px] leading-relaxed shadow-sm transition-all duration-300
                  ${msg.role === 'user'
                    ? 'bg-zinc-800/40 text-zinc-100 rounded-2xl rounded-tr-sm border border-white/5 whitespace-pre-wrap ml-auto'
                    : 'glass-panel text-zinc-200 rounded-2xl rounded-tl-sm border-l-2 border-l-brand-500'
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

              <div className={`flex items-center gap-2 mt-2 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-brand-400 text-[10px] uppercase font-bold tracking-wider">DocMind Agent</span>
                )}
                {msg.role === 'assistant' && (
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                )}
                <span className="text-zinc-600 text-[11px] font-mono tracking-wide">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="glass-panel border-l-2 border-l-brand-400 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce-dot"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-zinc-400 text-xs font-mono tracking-wide uppercase">{currentStage || 'Reasoning'}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 bg-gradient-to-t from-[#09090b] via-[#09090b]/90 to-transparent relative z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end glass-panel rounded-2xl p-2 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all duration-300">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask DocMind..."
              rows={1}
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm leading-relaxed resize-none outline-none px-4 py-3 max-h-40 scrollbar-thin scrollbar-thumb-zinc-700/50"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-10 h-10 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 mb-1 mr-1"
            >
              <svg className="w-5 h-5 translate-x-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <p className="text-zinc-600 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand-500"></span>
              Powered by LangGraph Agentic Pipeline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
