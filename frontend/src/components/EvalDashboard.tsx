import React, { useEffect, useState } from 'react';
import { getEvalResults, triggerEval } from '../lib/api';
import type { EvalScore } from '../lib/api';


interface ScoreBarProps { label: string; value: number; target: number; }
const ScoreBar: React.FC<ScoreBarProps> = ({ label, value, target }) => {
  const pct = Math.round(value * 100);
  const color = pct >= target * 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/60">
        <span>{label}</span>
        <span className={pct >= target * 100 ? 'text-emerald-400' : 'text-amber-400'}>
          {pct}%
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="relative"
        style={{ marginLeft: `${target * 100}%`, width: '1px' }}
      >
        <div className="absolute -top-4 -left-1 w-0.5 h-4 bg-white/30" />
        <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-white/30">
          target
        </span>
      </div>
    </div>
  );
};

export const EvalDashboard: React.FC = () => {
  const [data, setData] = useState<{ history: EvalScore[] } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchResults = async () => {
    try {
      const res = await getEvalResults();
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRunEval = async () => {
    setIsEvaluating(true);
    try {
      await triggerEval();
      setTimeout(fetchResults, 5000);
    } finally {
      setIsEvaluating(false);
    }
  };

  const scores = data?.history || [];

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      <div className="p-6 border-b border-zinc-800/60 bg-[#0c0c0e]/95 backdrop-blur z-10 sticky top-0 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-zinc-100 font-bold text-lg tracking-tight">RAGAS Evaluation</h2>
          <button
            onClick={handleRunEval}
            disabled={isEvaluating}
            className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            {isEvaluating ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running Eval...
              </>
            ) : (
              '▶ Run Evaluation'
            )}
          </button>
        </div>
        <p className="text-zinc-500 text-xs font-medium leading-relaxed">
          Evaluates the system using the RAGAS framework. Compares system answers against verified ground truth.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {scores.length === 0 && !isEvaluating ? (
          <div className="text-center py-12 text-zinc-500 text-sm font-medium">
            No evaluation runs yet. Click "Run Evaluation" to start.
          </div>
        ) : (
          scores.map((score) => (
            <div key={score.run_id} className="bg-[#18181b] border border-zinc-800/80 rounded-2xl p-5 shadow-sm hover:border-violet-500/30 transition-all group">
              <div className="flex items-center justify-between mb-5 border-b border-zinc-800/50 pb-3">
                <span className="text-zinc-300 text-xs font-semibold tracking-wide">
                  Run ID: <span className="text-zinc-500 font-mono ml-1">{score.run_id.split('-')[0]}</span>
                </span>
                <span className="text-zinc-500 text-xs font-medium">
                  {new Date(score.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="space-y-4">
                <ScoreBar label="Answer Relevancy" value={score.answer_relevancy} target={0.8} />
                <ScoreBar label="Faithfulness" value={score.faithfulness} target={0.8} />
                <ScoreBar label="Context Precision" value={score.context_precision} target={0.7} />
                <ScoreBar label="Context Recall" value={score.context_recall} target={0.7} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
