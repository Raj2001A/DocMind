import React, { useState } from 'react';
import type { SourceCitation } from '../lib/api';

interface Props {
  sources: SourceCitation[];
  confidence: number;
  queryType: string;
}

export const SourcePanel: React.FC<Props> = ({ sources, confidence, queryType }) => {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor =
    confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.5 ? 'text-amber-400' : 'text-red-400';

  const queryTypeLabel: Record<string, string> = {
    factual: '📌 Factual',
    comparative: '⚖️ Comparative',
    definitional: '📖 Definitional',
  };

  return (
    <div className="mt-2 border border-zinc-800/60 rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 transition-all"
      >
        <div className="flex items-center gap-3">
          <span className="bg-zinc-900 px-2 py-1 rounded text-zinc-500 font-medium border border-zinc-800/80">Sources: {sources.length}</span>
          <span className={`font-semibold ${confidenceColor}`}>
            {(confidence * 100).toFixed(0)}% confidence
          </span>
          <span className="text-zinc-500 font-medium">{queryTypeLabel[queryType] || queryType}</span>
        </div>
        <span className={`text-zinc-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-zinc-800/60">
          {sources.map((src, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-violet-300 font-semibold truncate max-w-[70%]">
                  📄 {src.filename}
                </span>
                <div className="flex items-center gap-2 text-zinc-500 shrink-0 font-medium">
                  <span>Pg {src.page}</span>
                  <span>·</span>
                  <span>Chunk {src.chunk_index}</span>
                </div>
              </div>
              <p className="text-zinc-400 italic leading-relaxed line-clamp-3">
                "{src.quote}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
