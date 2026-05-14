import React, { useEffect, useState } from 'react';
import { getEvalResults, triggerEval } from '../lib/api';
import type { EvalScore } from '../lib/api';


interface ScoreBarProps { label: string; value: number; target: number; }
const ScoreBar: React.FC<ScoreBarProps> = ({ label, value, target }) => {
  const pct = Math.round(value * 100);
  const color = pct >= target * 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#8e8e8e]">
        <span>{label}</span>
        <span className={pct >= target * 100 ? 'text-emerald-400' : 'text-amber-400'}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const EvalDashboard: React.FC = () => {
  const [data, setData] = useState<{ history: EvalScore[] } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');

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
    const interval = setInterval(fetchResults, 10000); // Polling for results
    return () => clearInterval(interval);
  }, []);

  const handleRunEval = async () => {
    setIsEvaluating(true);
    setError('');
    try {
      await triggerEval();
      // Eval runs in background. We'll poll for results.
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Evaluation failed to start.');
      setIsEvaluating(false);
    }
  };

  // If a new result appears, stop the "isEvaluating" state
  useEffect(() => {
    if (isEvaluating && data?.history && data.history.length > 0) {
      setIsEvaluating(false);
    }
  }, [data?.history, isEvaluating]);

  const scores = data?.history || [];

  return (
    <div className="flex flex-col h-full bg-[#171717]">
      <div className="p-5 border-b border-white/5 sticky top-0 bg-[#171717]/80 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#ececec] font-bold text-base">System Evaluation</h2>
          <button
            onClick={handleRunEval}
            disabled={isEvaluating}
            className="bg-white hover:bg-[#ececec] disabled:bg-[#2f2f2f] disabled:text-[#8e8e8e] text-black px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
          >
            {isEvaluating ? (
              <>
                <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Running...
              </>
            ) : (
              'Run RAGAS'
            )}
          </button>
        </div>
        <p className="text-[#8e8e8e] text-[11px] leading-relaxed">
          LLM-as-judge evaluation using the RAGAS framework. Measures faithfulness and relevancy.
        </p>
        {error && (
          <p className="text-red-400 text-[10px] mt-2 font-medium">{error}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {isEvaluating && (
          <div className="bg-[#2f2f2f]/30 border border-white/5 rounded-xl p-4 animate-pulse">
            <p className="text-[#ececec] text-xs font-medium text-center">Evaluation in progress... (can take up to 60s)</p>
          </div>
        )}
        
        {scores.length === 0 && !isEvaluating ? (
          <div className="text-center py-12 text-[#8e8e8e] text-xs font-medium italic">
            No evaluation data yet.
          </div>
        ) : (
          scores.map((score) => (
            <div key={score.run_id} className="bg-[#2f2f2f]/20 border border-white/5 rounded-xl p-4 transition-all hover:bg-[#2f2f2f]/40 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[#8e8e8e] text-[10px] font-bold uppercase tracking-widest">
                  Run <span className="text-[#ececec] font-mono ml-1">{score.run_id.split('-')[0]}</span>
                </span>
                <span className="text-[#8e8e8e] text-[10px] font-medium">
                  {new Date(score.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <ScoreBar label="Relevancy" value={score.answer_relevancy} target={0.8} />
                <ScoreBar label="Faithfulness" value={score.faithfulness} target={0.8} />
                <ScoreBar label="Precision" value={score.context_precision} target={0.7} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
