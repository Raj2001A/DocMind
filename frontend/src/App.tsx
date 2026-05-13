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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-violet-500/30 relative">
      {/* Background ambient glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-zinc-950/60 backdrop-blur-2xl sticky top-0 z-30 shadow-md shadow-black/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg shadow-violet-500/20 ring-1 ring-white/10">
            D
          </div>
          <div>
            <h1 className="text-zinc-100 font-bold text-lg tracking-tight leading-tight">DocMind</h1>
            <p className="text-zinc-400 text-xs font-medium tracking-wide">Agentic Documentation Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-xs font-medium hidden sm:block bg-zinc-900 px-3 py-1.5 rounded-full ring-1 ring-zinc-800">
            {documents.length} doc{documents.length !== 1 ? 's' : ''} indexed
          </span>
          <button
            onClick={clearChat}
            className="text-xs font-medium text-zinc-300 hover:text-white px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800/80 ring-1 ring-white/10 rounded-xl transition-all shadow-sm hover:shadow-lg active:scale-95"
          >
            New Chat
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/5 flex flex-col bg-zinc-950/40 backdrop-blur-3xl shrink-0 relative z-10 shadow-2xl shadow-black/50">
          {/* Tab switcher */}
          <div className="flex border-b border-white/5 bg-zinc-950/40 backdrop-blur-md">
            {(['docs', 'eval'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all relative ${
                  sidebarTab === tab
                    ? 'text-violet-400 bg-violet-500/5'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                {tab === 'docs' ? '📂 Documents' : '📊 Eval'}
                {sidebarTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-violet-400 shadow-[0_-2px_8px_rgba(139,92,246,0.5)]" />
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
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-300 text-sm group relative overflow-hidden ${
                            isActive
                              ? 'bg-violet-500/10 border-violet-500/30 text-zinc-100 shadow-[inset_0_0_20px_rgba(139,92,246,0.05)] ring-1 ring-violet-500/20'
                              : 'bg-zinc-900/30 border-white/5 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 relative z-10">
                            <div className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isActive ? 'bg-violet-500 border-violet-500' : 'border-zinc-600 group-hover:border-zinc-400'}`}>
                              {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate font-medium transition-colors ${isActive ? 'text-violet-200' : 'text-zinc-300'}`}>{doc.filename}</p>
                              <p className="text-zinc-500 text-xs mt-0.5">{doc.chunk_count} chunks</p>
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
