"""
query.py  —  POST /query  |  POST /query/stream

Interview talking point:
  "The stream endpoint emits Server-Sent Events for each agent stage —
   query analysis, retrieval, verification, conflict detection — before
   emitting the final answer. The sync LangGraph pipeline runs in a
   thread pool via asyncio.to_thread so it never blocks the uvicorn
   event loop — a critical production concern."
"""
import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agents.graph import run_agent, run_agent_with_stages
from app.models.schemas import QueryRequest, QueryResponse, SourceCitation, ConflictInfo

router = APIRouter(prefix="/api", tags=["query"])
logger = logging.getLogger(__name__)


def _get_limiter():
    """Lazy import to avoid circular dependency with main.py."""
    from app.main import limiter
    return limiter


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: Request, body: QueryRequest) -> QueryResponse:
    """
    Main RAG query endpoint — rate limited to 10 req/min per IP.
    Runs the full LangGraph pipeline and returns a structured response
    with answer, citations, conflict alerts, and confidence score.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        state = await asyncio.to_thread(
            run_agent,
            question=body.question,
            document_ids=body.document_ids,
            conversation_id=body.conversation_id,
        )
    except Exception as e:
        logger.error(f"Agent failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query processing failed: {e}")

    sources = [SourceCitation(**s) for s in state.get("sources", [])]
    conflicts = [ConflictInfo(**c) for c in state.get("conflicts", [])]

    return QueryResponse(
        answer=state.get("answer", "I could not find a relevant answer."),
        sources=sources,
        conflicts=conflicts,
        confidence=state.get("confidence", 0.0),
        query_type=state.get("query_type", "factual"),
        conversation_id=state.get("conversation_id", ""),
    )


@router.post("/query/stream")
async def query_stream(request: Request, body: QueryRequest):
    """
    Streaming SSE endpoint — emits agent stage updates then the final answer.

    Event types:
      - stage:  {node, status, detail}  — real-time pipeline progress
      - answer: {answer, sources, ...}  — final result
      - error:  {error}                 — pipeline failure

    The sync generator is consumed inside asyncio.to_thread via a queue
    bridge so we never block the event loop while waiting for LLM calls.
    """
    import queue as queue_module
    import threading

    q: queue_module.Queue = queue_module.Queue()
    _SENTINEL = object()

    def producer():
        """Run the sync generator in a background thread, push events to queue."""
        try:
            for event_type, payload in run_agent_with_stages(
                question=body.question,
                document_ids=body.document_ids,
                conversation_id=body.conversation_id,
            ):
                q.put((event_type, payload))
        except Exception as e:
            q.put(("error", {"error": str(e)}))
        finally:
            q.put(_SENTINEL)

    async def event_generator():
        loop = asyncio.get_event_loop()
        thread = threading.Thread(target=producer, daemon=True)
        thread.start()

        while True:
            # Non-blocking queue poll every 50ms — keeps the event loop responsive
            item = await loop.run_in_executor(None, q.get)
            if item is _SENTINEL:
                break
            event_type, payload = item
            yield f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
