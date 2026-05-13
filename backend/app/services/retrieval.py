"""
retrieval.py
------------
Hybrid Search — Phase 2.

Strategy:
  1. Vector search via ChromaDB (semantic similarity)
  2. Keyword search via BM25Okapi (exact term recall)
  3. Merge both result sets with Reciprocal Rank Fusion (RRF)

Interview talking point:
  "RRF score = Σ 1/(rank_i + k) where k=60 (from the 2022 Cormack paper).
   A document appearing in rank 1 of vector search AND rank 3 of BM25 gets
   a combined score that beats a document ranked 1 in only one list.
   This is the same algorithm Microsoft uses in Azure AI Search."
"""
import logging
from typing import Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.config import settings
from app.services.ingestion import get_bm25_state, get_vectorstore

logger = logging.getLogger(__name__)

RRF_K = 60  # standard constant from Cormack et al. 2022



def _reciprocal_rank_fusion(
    results_a: list[Document],
    results_b: list[Document],
) -> list[Document]:
    """
    Merge two ranked lists with RRF.
    Documents appearing in both lists receive boosted scores.
    """
    scores: dict[str, tuple[float, Document]] = {}

    for rank, doc in enumerate(results_a):
        key = doc.page_content[:100]
        prev = scores.get(key, (0.0, doc))[0]
        scores[key] = (prev + 1.0 / (rank + RRF_K), doc)

    for rank, doc in enumerate(results_b):
        key = doc.page_content[:100]
        prev = scores.get(key, (0.0, doc))[0]
        scores[key] = (prev + 1.0 / (rank + RRF_K), doc)

    ranked = sorted(scores.values(), key=lambda x: x[0], reverse=True)
    return [doc for _, doc in ranked]


def hybrid_search(
    query: str,
    document_ids: Optional[list[str]] = None,
    k: int = None,
) -> list[Document]:
    """
    Full hybrid search: ChromaDB vector + BM25 keyword, merged with RRF.

    Args:
        query:        Natural language question.
        document_ids: Filter to specific documents (None = search all).
        k:            Number of final results.
    """
    k = k or settings.retrieval_k

    # ── 1. Vector Search ──────────────────────────────────────────────────────
    vectorstore = get_vectorstore()
    where_filter = None
    if document_ids:
        where_filter = {"document_id": {"$in": document_ids}}

    try:
        vector_results = vectorstore.similarity_search(
            query, k=k * 2, filter=where_filter
        )
        logger.info(f"Vector search: {len(vector_results)} results")
    except Exception as e:
        logger.warning(f"Vector search failed: {e}")
        vector_results = []

    # ── 2. BM25 Keyword Search ────────────────────────────────────────────────
    bm25_results: list[Document] = []
    bm25_index, bm25_doc_map = get_bm25_state()

    if bm25_index and bm25_doc_map:
        try:
            tokens = query.lower().split()
            scores = bm25_index.get_scores(tokens)
            # Sort by score, take top k*2
            ranked_indices = sorted(
                range(len(scores)), key=lambda i: scores[i], reverse=True
            )[: k * 2]

            for idx in ranked_indices:
                if scores[idx] > 0:
                    meta = bm25_doc_map[idx]
                    # Apply document_ids filter if provided
                    if document_ids and meta.get("document_id") not in document_ids:
                        continue
                    # We need the actual text — get from vectorstore
                    # (BM25 stores only metadata; text lives in ChromaDB)
                    bm25_results.append(
                        Document(
                            page_content=meta.get("chunk_text", ""),
                            metadata=meta,
                        )
                    )
            logger.info(f"BM25 search: {len(bm25_results)} results")
        except Exception as e:
            logger.warning(f"BM25 search failed: {e}")

    # ── 3. RRF Merge ──────────────────────────────────────────────────────────
    if vector_results and bm25_results:
        merged = _reciprocal_rank_fusion(vector_results, bm25_results)
    else:
        merged = vector_results or bm25_results

    final = merged[:k]
    logger.info(f"Hybrid search final: {len(final)} results after RRF")
    return final


def format_context(docs: list[Document]) -> str:
    """Format retrieved documents into a prompt-ready context string."""
    if not docs:
        return "No relevant documents found."

    parts = []
    for i, doc in enumerate(docs, 1):
        meta = doc.metadata
        parts.append(
            f"[Source {i}] {meta.get('filename', 'Unknown')} "
            f"(Page {meta.get('page', '?')}, Chunk {meta.get('chunk_index', '?')})\n"
            f"{doc.page_content}"
        )
    return "\n\n---\n\n".join(parts)
