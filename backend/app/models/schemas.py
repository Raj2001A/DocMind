"""
schemas.py
----------
Pydantic request / response models shared across all routes.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Upload ────────────────────────────────────────────────────────────────────
class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunk_count: Optional[int] = 0
    status: str
    message: str


# ── Query ─────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    document_ids: Optional[list[str]] = None  # None = search all docs
    conversation_id: Optional[str] = None


class SourceCitation(BaseModel):
    document_id: str
    filename: str
    page: int
    chunk_index: int
    quote: str          # exact excerpt used
    confidence: float   # 0.0 – 1.0


class ConflictInfo(BaseModel):
    doc_a: str
    doc_b: str
    description: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceCitation]
    conflicts: list[ConflictInfo] = []
    confidence: float
    query_type: str     # factual | comparative | definitional
    conversation_id: str


# ── Evaluation ────────────────────────────────────────────────────────────────
class EvalScore(BaseModel):
    run_id: str
    timestamp: datetime
    answer_relevancy: float
    faithfulness: float
    context_precision: float
    context_recall: float
    question_count: int


class EvalResponse(BaseModel):
    latest: Optional[EvalScore]
    history: list[EvalScore]
