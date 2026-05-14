import { useCallback, useState } from 'react';
import { DocumentUploader } from './components/DocumentUploader';
import { ChatInterface } from './components/ChatInterface';
import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';
import './index.css';

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconSidebarToggle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const IconNewChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// DocMind brand logo icon
const DocMindLogo = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="white" />
    <path d="M8 10h10a6 6 0 0 1 0 12H8V10z" fill="black" />
    <circle cx="22" cy="16" r="2" fill="white" />
  </svg>
);

export default function App() {
  const { messages, isLoading, currentStage, sendMessage, clearChat } = useChat();
  const {
    documents,
    activeDocIds,
    fetchDocuments,
    addDocument,
    toggleDocFilter,
    removeDocument,
  } = useDocuments();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    <div className="h-screen bg-[#000] text-[#ececec] flex font-sans overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`${sidebarOpen ? 'w-[260px]' : 'w-0'} bg-[#000] flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0 border-r border-white/[0.06]`}
      >
        {/* ── Sidebar top row: logo + toggle ── */}
        <div className="flex items-center justify-between px-3 pt-6 pb-4">
          <div className="flex items-center gap-2 px-1">
            <DocMindLogo />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#212121] rounded-lg transition-colors"
            title="Close sidebar"
          >
            <IconSidebarToggle />
          </button>
        </div>

        {/* ── Nav items ── */}
        <nav className="px-3 mt-4 space-y-1">
          <button
            onClick={() => clearChat()}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm text-[#ececec] hover:bg-[#212121] transition-colors text-left font-medium"
          >
            <span className="text-[#ececec]"><IconNewChat /></span>
            New chat
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-[#ececec] hover:bg-[#212121] transition-colors text-left font-medium"
          >
            <span className="text-[#ececec]"><IconSearch /></span>
            Search chats
          </button>
        </nav>

        {/* ── Divider ── */}
        <div className="mx-4 mt-5 mb-4 h-px bg-white/[0.06]" />

        {/* ── Projects section ── */}
        <div className="flex-1 overflow-y-auto px-3 min-h-0">
          <p className="px-3 mb-3 mt-2 text-xs font-semibold text-[#686868] tracking-widest uppercase">
            Documents
          </p>

          <div className="space-y-1">
            {/* Upload button — styled as a nav item */}
            <div className="px-0 mb-1">
              <DocumentUploader onUploadComplete={handleUploadComplete} />
            </div>

            {/* Document list */}
            {documents.map((doc) => {
              const isActive = activeDocIds.includes(doc.document_id);
              const isProcessing = doc.status === 'processing';
              const isError = doc.status === 'error';

              return (
                <div key={doc.document_id} className="group relative flex items-center mb-1.5">
                  <button
                    onClick={() => !isProcessing && !isError && toggleDocFilter(doc.document_id)}
                    disabled={isProcessing || isError}
                    className={`flex-1 flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm transition-colors truncate text-left font-medium ${
                      isProcessing
                        ? 'bg-[#1a1a1a] text-[#555] cursor-wait'
                        : isError
                        ? 'bg-[#2a1a1a] text-red-400'
                        : isActive
                        ? 'bg-[#212121] text-white border-l-2 border-white/25'
                        : 'text-[#d4d4d4] hover:bg-[#212121] border-l-2 border-transparent'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-4 h-4 border-2 border-[#555]/40 border-t-[#8e8e8e] rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className={`shrink-0 ${isError ? 'text-red-900' : 'text-[#686868]'}`}><IconFolder /></span>
                    )}
                    <span className="truncate">
                      {doc.filename}
                      {isProcessing && <span className="ml-2 text-[10px] text-[#555] uppercase tracking-wider font-bold">Processing...</span>}
                      {isError && <span className="ml-2 text-[10px] text-red-500 uppercase tracking-wider font-bold">Failed</span>}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDocument(doc.document_id);
                    }}
                    className="absolute right-1.5 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#2a2a2a] rounded-md transition-all text-[#8e8e8e] hover:text-red-400"
                    title="Delete document"
                  >
                    <IconTrash />
                  </button>
                </div>
              );
            })}

            {documents.length === 0 && (
              <p className="px-3 py-3 text-xs text-[#555] italic">No documents yet</p>
            )}
          </div>
        </div>

        {/* ── Sidebar footer ── */}
        <div className="px-3 py-4 shrink-0 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#212121] cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold text-xs shrink-0">
              DM
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#ececec] truncate">DocMind</p>
              <p className="text-xs text-[#686868]">RAG System</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#212121] relative h-full">

        {/* ── Top header ── */}
        <header className="flex items-center justify-between h-[52px] px-3 shrink-0">
          <div className="flex items-center gap-1">
            {/* Show sidebar toggle in header when sidebar is closed */}
            {!sidebarOpen && (
              <>
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#2f2f2f] rounded-lg transition-colors"
                  title="Open sidebar"
                >
                  <IconSidebarToggle />
                </button>
                <button
                  onClick={() => clearChat()}
                  className="p-2 text-[#8e8e8e] hover:text-[#ececec] hover:bg-[#2f2f2f] rounded-lg transition-colors ml-1"
                  title="New chat"
                >
                  <IconNewChat />
                </button>
              </>
            )}
            <button className={`flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#2f2f2f] rounded-lg transition-colors ${!sidebarOpen ? 'ml-2' : ''}`}>
              <span className="text-[15px] font-semibold text-[#ececec]">DocMind</span>
              <svg className="w-3.5 h-3.5 text-[#8e8e8e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ececec] text-black text-sm font-semibold rounded-full hover:bg-white transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share
            </button>
            <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center text-white font-bold text-xs cursor-pointer hover:opacity-90 transition-all ml-2 mr-2">
              DM
            </div>
          </div>
        </header>

        {/* ── Chat ── */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            currentStage={currentStage}
            onSend={handleSend}
          />
        </main>
      </div>
    </div>
  );
}
