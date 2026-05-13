"""
eval.py  —  POST /eval/run  |  GET /eval/results
Phase 5: RAGAS evaluation endpoints (thin route layer).
"""
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import EvalResponse, EvalScore
from app.models.db import save_eval_score, get_eval_history
from datetime import datetime

router = APIRouter(prefix="/api/eval", tags=["evaluation"])
logger = logging.getLogger(__name__)

# Track if eval is running (simple lock)
_eval_running = False


async def _run_eval_task():
    """Background task wrapper around the evaluation service."""
    global _eval_running
    try:
        from app.services.evaluation import run_ragas_evaluation

        scores = run_ragas_evaluation()
        save_eval_score(scores, scores["question_count"])
        logger.info(f"RAGAS eval complete: {scores}")
    except Exception as e:
        logger.error(f"RAGAS evaluation failed: {e}")
    finally:
        _eval_running = False


@router.post("/run")
async def trigger_eval(background_tasks: BackgroundTasks):
    global _eval_running
    if _eval_running:
        raise HTTPException(status_code=409, detail="Evaluation already running.")
    _eval_running = True
    background_tasks.add_task(_run_eval_task)
    return {"message": "Evaluation started. Check /api/eval/results in ~60 seconds."}


@router.get("/results", response_model=EvalResponse)
async def get_results():
    history_raw = get_eval_history(limit=10)
    history = [
        EvalScore(
            run_id=row["run_id"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            answer_relevancy=row["answer_relevancy"],
            faithfulness=row["faithfulness"],
            context_precision=row["context_precision"],
            context_recall=row["context_recall"],
            question_count=row["question_count"],
        )
        for row in history_raw
    ]
    return EvalResponse(
        latest=history[0] if history else None,
        history=history,
    )
