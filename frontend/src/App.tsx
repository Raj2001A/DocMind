import { useCallback } from 'react';
import { useState } from 'react';
import { DocumentUploader } from './components/DocumentUploader';
import { ChatInterface } from './components/ChatInterface';
import { EvalDashboard } from './components/EvalDashboard';
import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';
import './index.css';


export default function App() {
  const { messages, isLoading, currentStage, sendMessage, clearChat } = useChat();
  const {
    documents,
    activeDocIds,
    fetchDocuments,
    addDocument,
    toggleDocFilter,
  } = useDocuments();
  const [sidebarTab, setSidebarTab] = useState<'docs' | 'eval'>('docs');

  const handleUploadComplete = useCallback(
    (doc: { document_id: string; filename: string; chunk_count: number }) => {
      fetchDocuments();
      addDocument(doc.document_id);
    },
    [fetchDocuments, addDocument]
  );

  const handleSend = (question: string) => {
    sendMessage(question, activeDocIds.length > 0 ? activeDocIds : undefined);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-brand-500/30 relative">
      {/* Refined Ambient Backgrounds */}
      <div className="fixed top-[-25%] left-[-15%] w-[60%] h-[60%] bg-brand-900/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-900/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-fuchsia-900/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header - Minimal & Glassmorphic */}
      <header className="glass-panel border-b-0 border-x-0 border-t-0 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-violet-500 p-[1px] shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-[#09090b] rounded-full flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white animate-soft-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-zinc-100 font-semibold text-[15px] tracking-wide">DocMind<span className="text-zinc-500 font-light ml-1">AI</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            {documents.length} Indexed
          </div>
          <button
            onClick={clearChat}
            className="text-xs font-medium text-zinc-300 hover:text-white px-4 py-1.5 glass-button rounded-full"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10 border-t border-white/5">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/5 flex flex-col bg-zinc-950/40 backdrop-blur-3xl shrink-0 relative z-10 shadow-2xl shadow-black/50">
          {/* Tab switcher */}
          <div className="flex border-b border-white/5 bg-transparent">
            {(['docs', 'eval'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-4 text-xs font-medium transition-all relative ${
                  sidebarTab === tab
                    ? 'text-brand-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'docs' ? 'DOCUMENTS' : 'EVALUATION'}
                {sidebarTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-500 shadow-[0_-2px_8px_rgba(99,102,241,0.5)]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {sidebarTab === 'docs' ? (
              <div className="space-y-4">
                {/* Uploader */}
                <DocumentUploader onUploadComplete={handleUploadComplete} />

                {/* Document list */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest pl-1">
                      Indexed Documents
                    </p>
                    {documents.map((doc) => {
                      const isActive = activeDocIds.includes(doc.document_id);
                      return (
                        <button
                          key={doc.document_id}
                          onClick={() => toggleDocFilter(doc.document_id)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-300 text-sm group relative overflow-hidden ${
                            isActive
                              ? 'bg-brand-500/10 border-brand-500/30 text-zinc-100 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]'
                              : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center gap-3 relative z-10">
                            <div className={`shrink-0 w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${isActive ? 'bg-brand-500 border-brand-500' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm font-medium transition-colors ${isActive ? 'text-brand-100' : 'text-zinc-300'}`}>{doc.filename}</p>
                              <p className="text-zinc-600 font-mono text-[10px] mt-1">{doc.chunk_count} CHUNKS</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {documents.length > 0 && (
                      <div className="pt-2 text-center">
                        <p className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium">
                          {activeDocIds.length === 0
                            ? '✨ Searching all documents'
                            : `🔍 Searching ${activeDocIds.length} selected`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <EvalDashboard />
            )}
          </div>
        </aside>

        {/* Main chat */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface messages={messages} isLoading={isLoading} currentStage={currentStage} onSend={handleSend} />
        </main>
      </div>
    </div>
  );
}
