import React from 'react';
import type { ConflictInfo } from '../lib/api';


interface Props {
  conflicts: ConflictInfo[];
}

export const ConflictAlert: React.FC<Props> = ({ conflicts }) => {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="mb-4 bg-[#2a1a0f]/80 backdrop-blur-md border border-amber-500/30 rounded-xl overflow-hidden shadow-lg shadow-amber-500/5">
      <div className="bg-amber-500/10 px-4 py-3 flex items-center gap-3 border-b border-amber-500/20">
        <span className="text-amber-500 text-lg">⚠️</span>
        <h4 className="text-amber-500 font-bold text-sm tracking-wide">Conflicting Information Detected</h4>
      </div>
      <div className="p-4 space-y-3">
        {conflicts.map((c, i) => (
          <div key={i} className="text-sm bg-black/40 rounded-lg p-3 border border-amber-500/10">
            <p className="text-zinc-300 font-medium leading-relaxed">{c.description}</p>
            <div className="mt-2 text-xs flex items-center gap-2">
              <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded truncate max-w-[45%] border border-zinc-700">{c.doc_a}</span>
              <span className="text-zinc-600">vs</span>
              <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded truncate max-w-[45%] border border-zinc-700">{c.doc_b}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
