import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../hooks/useChat';
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

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

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
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center h-full pb-20 animate-in fade-in duration-500 slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold text-[#ececec] mb-8 tracking-tight">What can I help with?</h1>
            
            {/* Starter chips */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl px-5 mt-4">
              {[
                { title: 'Summarize a document', icon: '📝' },
                { title: 'Find contradictions', icon: '⚖️' },
                { title: 'Extract key terms', icon: '🔍' },
                { title: 'Explain core concepts', icon: '💡' }
              ].map((chip) => (
                <button
                  key={chip.title}
                  onClick={() => onSend(chip.title)}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#2f2f2f]/50 hover:bg-[#2f2f2f] transition-all text-left group hover:border-white/20 hover:-translate-y-0.5"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{chip.icon}</span>
                  <span className="text-sm font-medium text-[#ececec]">{chip.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Message list ────────────────────────────────────── */
          <div className="max-w-[48rem] mx-auto px-5 py-8 w-full pb-10">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-10 animate-in fade-in duration-300 slide-in-from-bottom-2">
                {msg.role === 'user' ? (
                  <div className="flex justify-end mb-4">
                    <div className="bg-[#2f2f2f] text-[#ececec] rounded-3xl px-5 py-3 max-w-[85%] text-[16px] leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 items-start w-full">
                    {/* DocMind Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden bg-white shadow-sm">
                      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="white" />
                        <path d="M8 10h10a6 6 0 0 1 0 12H8V10z" fill="black" />
                        <circle cx="22" cy="16" r="2" fill="white" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1 text-[#ececec]">
                      {msg.response?.conflicts && msg.response.conflicts.length > 0 && (
                        <div className="mb-6">
                          <ConflictAlert conflicts={msg.response.conflicts} />
                        </div>
                      )}

                      <div className="prose-docmind font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {msg.response?.sources && msg.response.sources.length > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2f2f2f] hover:bg-[#212121] cursor-pointer transition-colors text-xs text-[#b4b4b4] font-medium">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            Sources
                          </div>
                        </div>
                      )}

                      {/* Action row (Copy, Regenerate, Thumbs down) */}
                      <div className="flex items-center gap-2 mt-4">
                        <button className="p-1.5 hover:bg-[#2f2f2f] hover:text-[#ececec] rounded-md text-[#8e8e8e] transition-colors hover:scale-[1.05] active:scale-[0.95]">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                        <button className="p-1.5 hover:bg-[#2f2f2f] hover:text-[#ececec] rounded-md text-[#8e8e8e] transition-colors hover:scale-[1.05] active:scale-[0.95]">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                          </svg>
                        </button>
                        <button className="p-1.5 hover:bg-[#2f2f2f] hover:text-[#ececec] rounded-md text-[#8e8e8e] transition-colors hover:scale-[1.05] active:scale-[0.95]">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4 items-start w-full animate-in fade-in duration-300">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden bg-white shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="8" fill="white" />
                    <path d="M8 10h10a6 6 0 0 1 0 12H8V10z" fill="black" />
                    <circle cx="22" cy="16" r="2" fill="white" />
                  </svg>
                </div>
                <div className="flex-1 pt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[#ececec] rounded-full animate-pulse-dot" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-[#ececec] rounded-full animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-[#ececec] rounded-full animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                  </div>
                  {currentStage && (
                    <span className="block mt-2 text-[11px] font-medium text-[#8e8e8e]">{currentStage}</span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input area ──────────────────────────────────────────── */}
      <div className="w-full pt-2 pb-4 px-5 shrink-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent">
        <div className="max-w-[48rem] mx-auto w-full">
          <div className="bg-[#2f2f2f] rounded-[26px] p-2 flex items-end gap-1 group focus-within:ring-1 focus-within:ring-white/10 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
            {/* Attachment Button */}
            <button className="p-2.5 rounded-full hover:bg-[#424242] transition-colors shrink-0 mb-0.5 ml-1 text-[#ececec]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything"
              rows={1}
              className="flex-1 bg-transparent text-[#ececec] placeholder-[#b4b4b4] text-[16px] resize-none outline-none leading-relaxed max-h-[200px] py-2 px-1"
              style={{ minHeight: '24px' }}
            />

            {/* Voice Button */}
            <button className="p-2.5 rounded-full hover:bg-[#424242] transition-colors shrink-0 mb-0.5 text-[#ececec]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </button>

            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="shrink-0 w-8 h-8 bg-[#ececec] hover:bg-white disabled:opacity-50 text-black rounded-full flex items-center justify-center transition-all mb-1.5 mr-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            ) : (
              <button className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1.5 mr-2 hover:bg-[#424242] transition-colors">
                 <svg className="w-5 h-5 text-[#ececec]" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M8 5v14l11-7z" />
                 </svg>
              </button>
            )}
          </div>
          <p className="text-center text-xs text-[#8e8e8e] mt-3 pb-1 font-medium">
            DocMind can make mistakes. Verify with source citations.
          </p>
        </div>
      </div>
    </div>
  );
};
