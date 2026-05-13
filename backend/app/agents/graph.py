"""
graph.py
--------
LangGraph multi-agent pipeline — Phase 3.

DAG:
  query_analyzer
      ↓
  multi_doc_retriever
      ↓
  fact_verifier ──(confidence < 0.75)──► multi_doc_retriever (retry)
      ↓
  conflict_detector
      ↓
  response_synthesizer

Interview talking point:
  "I used LangGraph's StateGraph instead of a simple LangChain chain because
   RAG needs conditional edges. If the fact_verifier scores confidence < 0.75,
   the graph re-routes back to retrieval with a broader query — impossible in
   a linear chain. The graph also maintains conversation memory across turns
   using a MessagesState that stores the last 5 exchanges."
"""
import logging
import uuid
from typing import Annotated, Any, Optional, TypedDict

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from app.config import settings
from app.services.retrieval import hybrid_search, format_context
from app.models.schemas import SourceCitation, ConflictInfo

logger = logging.getLogger(__name__)

# ── State Definition ──────────────────────────────────────────────────────────
class AgentState(TypedDict):
    # Inputs
    question: str
    document_ids: Optional[list[str]]
    conversation_id: str

    # Conversation memory (last 5 turns)
    messages: Annotated[list[BaseMessage], add_messages]

    # Internal pipeline state
    query_type: str                  # factual | comparative | definitional
    retrieved_docs: list[Any]        # LangChain Document objects
    context_string: str
    retry_count: int

    # Outputs
    answer: str
    sources: list[dict]
    conflicts: list[dict]
    confidence: float


# ── LLM Factory ──────────────────────────────────────────────────────────────
def _get_llm(temperature: float = 0.0):
    """
    Provider-agnostic LLM factory.
    Controlled by settings.llm_provider: 'gemini' | 'openai' | 'ollama'

    Interview talking point:
      "I designed this as a factory pattern so the LLM backend is swappable
       via a single env variable — no code changes needed to switch from
       Gemini to OpenAI to a local Ollama model."
    """
    provider = settings.llm_provider.lower()

    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.gemini_api_key,
            temperature=temperature,
            convert_system_message_to_human=True,  # Gemini requirement
        )
    elif provider == "ollama" or settings.use_local_llm:
        from langchain_community.llms import Ollama
        return Ollama(model=settings.ollama_model, base_url=settings.ollama_base_url)
    else:  # default: openai
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_model,
            openai_api_key=settings.openai_api_key,
            temperature=temperature,
        )


def _extract_text(content: Any) -> str:
    """
    Helper to handle both string and list-of-blocks content from LLMs.
    """
    logger.debug(f"Extracting text from content type: {type(content)}")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts = []
        for block in content:
            if isinstance(block, str):
                text_parts.append(block)
            elif isinstance(block, dict):
                # Handle standard content blocks or OpenAI-style tool results
                text_parts.append(block.get("text", str(block)))
            else:
                text_parts.append(str(block))
        return "".join(text_parts)
    
    # If it's a ToolMessage or similar with structured content
    if hasattr(content, "text"):
        return getattr(content, "text")
        
    return str(content)


# ── Node 1: Query Analyzer ────────────────────────────────────────────────────
def query_analyzer_node(state: AgentState) -> AgentState:
    """Classify the query type to tailor the retrieval & synthesis strategy."""
    llm = _get_llm()
    prompt = f"""Classify the following question into exactly one of these types:
- factual: asking for a specific fact, value, or definition
- comparative: asking to compare two or more things
- definitional: asking what something is or means

Question: {state['question']}

Reply with ONLY the type word (factual / comparative / definitional).
"""
    response = llm.invoke(prompt)
    query_type = _extract_text(response.content).strip().lower()
    if query_type not in ("factual", "comparative", "definitional"):
        query_type = "factual"

    logger.info(f"Query type: {query_type}")
    return {**state, "query_type": query_type, "retry_count": 0}


# ── Node 2: Multi-Document Retriever ─────────────────────────────────────────
def retriever_node(state: AgentState) -> AgentState:
    """Hybrid search across all (or filtered) documents."""
    retry = state.get("retry_count", 0)

    # On retry, broaden the query with synonyms
    query = state["question"]
    if retry > 0:
        query = f"{query} explanation overview definition"
        logger.info(f"Retry {retry}: broadened query")

    docs = hybrid_search(
        query=query,
        document_ids=state.get("document_ids"),
        k=settings.retrieval_k,
    )
    context = format_context(docs)

    return {**state, "retrieved_docs": docs, "context_string": context}


# ── Node 3: Fact Verifier ────────────────────────────────────────────────────
def fact_verifier_node(state: AgentState) -> AgentState:
    """
    Check if the retrieved context is sufficient to answer the question.
    Returns a confidence score 0.0–1.0.

    Interview talking point:
      "This node acts as a hallucination guard. If the context doesn't contain
       enough information to answer, I retry retrieval with a broader query
       instead of letting the LLM hallucinate. This is the key difference
       between a demo RAG and a production RAG."
    """
    if not state["retrieved_docs"]:
        return {**state, "confidence": 0.0}

    llm = _get_llm()
    prompt = f"""You are a fact-checking assistant. Given a question and retrieved context,
rate how well the context answers the question on a scale of 0.0 to 1.0.

0.0 = Context is completely irrelevant
0.5 = Context is partially relevant
1.0 = Context directly and fully answers the question

Question: {state['question']}

Retrieved Context:
{state['context_string'][:3000]}

Reply with ONLY a decimal number between 0.0 and 1.0.
"""
    try:
        response = llm.invoke(prompt)
        confidence = float(_extract_text(response.content).strip())
        confidence = max(0.0, min(1.0, confidence))
    except Exception:
        confidence = 0.5

    logger.info(f"Fact verifier confidence: {confidence:.2f}")
    return {**state, "confidence": confidence}


def should_retry_or_proceed(state: AgentState) -> str:
    """Conditional edge: retry retrieval if confidence is too low."""
    if state["confidence"] < 0.6 and state.get("retry_count", 0) < 2:
        return "retry"
    return "proceed"


# ── Node 4: Conflict Detector ─────────────────────────────────────────────────
def conflict_detector_node(state: AgentState) -> AgentState:
    """
    Detect contradictions between retrieved documents.

    Interview talking point:
      "When a user queries two versions of an API doc, they might get
       contradictory answers. The conflict detector surfaces this explicitly
       with a red banner in the UI instead of silently choosing one answer."
    """
    docs = state["retrieved_docs"]
    conflicts: list[dict] = []

    if len(docs) < 2:
        return {**state, "conflicts": conflicts}

    # Check pairs of documents from different sources
    seen_files = {}
    for doc in docs:
        fname = doc.metadata.get("filename", "")
        if fname not in seen_files:
            seen_files[fname] = doc.page_content[:500]

    if len(seen_files) >= 2:
        files = list(seen_files.items())
        llm = _get_llm()
        
        # Build a single prompt containing all document excerpts
        docs_context = ""
        for idx, (name, text) in enumerate(files):
            docs_context += f"Document {idx+1} ({name}):\n{text}\n\n"

        prompt = f"""You are a technical conflict detector. Read the following document excerpts and determine if they contain contradictory information about the topic "{state['question']}".

{docs_context}

If there is NO contradiction between any of these documents, reply with exactly: NO_CONFLICT

If there IS a contradiction, reply with exactly:
CONFLICT: <doc name 1> vs <doc name 2> - <one sentence describing the contradiction>
"""
        try:
            resp = llm.invoke(prompt)
            result = _extract_text(resp.content).strip()
            
            if result.startswith("CONFLICT:"):
                # E.g. "CONFLICT: api_v1.md vs api_v2.md - The auth endpoint changed from /v1/auth to /v2/auth"
                parts = result.replace("CONFLICT:", "").split("-", 1)
                desc = parts[1].strip() if len(parts) > 1 else result
                doc_names = parts[0].strip() if len(parts) > 1 else "Multiple Docs"
                
                conflicts.append({
                    "doc_a": doc_names,
                    "doc_b": "Detected Conflict",
                    "description": desc,
                })
        except Exception as e:
            logger.warning(f"Conflict detection failed: {e}")

    return {**state, "conflicts": conflicts}


# ── Node 5: Response Synthesizer ─────────────────────────────────────────────
def synthesizer_node(state: AgentState) -> AgentState:
    """
    Generate the final answer with exact citations (document + page + quote).
    """
    llm = _get_llm(temperature=0.1)

    # Build conversation history for context
    history_str = ""
    recent_messages = state.get("messages", [])[-10:]
    if recent_messages:
        history_lines = []
        for msg in recent_messages:
            role = "User" if isinstance(msg, HumanMessage) else "Assistant"
            history_lines.append(f"{role}: {msg.content[:200]}")
        history_str = "\n".join(history_lines)

    conflict_warning = ""
    if state["conflicts"]:
        conflict_warning = (
            "\n\nWARNING: Conflicting information was detected across documents. "
            "Flag this in your answer.\n"
        )

    prompt = f"""You are a precise technical documentation assistant.

{f"Conversation history:{chr(10)}{history_str}{chr(10)}" if history_str else ""}
Question Type: {state['query_type']}

Retrieved Documentation Context:
{state['context_string']}
{conflict_warning}

User Question: {state['question']}

Instructions:
1. Answer the question ONLY using information from the context above.
2. For every claim, cite the source as [Source N] matching the context headers.
3. If the context doesn't contain enough information, say so clearly.
4. Be precise and technical. Do not add information not in the context.
5. Format your response in markdown.

Answer:"""

    response = llm.invoke(prompt)
    answer = _extract_text(response.content).strip()

    # Build structured source citations
    sources = []
    for i, doc in enumerate(state["retrieved_docs"]):
        meta = doc.metadata
        sources.append({
            "document_id": meta.get("document_id", ""),
            "filename": meta.get("filename", ""),
            "page": meta.get("page", 0),
            "chunk_index": meta.get("chunk_index", 0),
            "quote": doc.page_content[:200],
            "confidence": state["confidence"],
        })

    # Add to conversation memory
    new_messages = [
        HumanMessage(content=state["question"]),
        AIMessage(content=answer),
    ]

    return {**state, "answer": answer, "sources": sources, "messages": new_messages}


# ── Retry counter increment ───────────────────────────────────────────────────
def increment_retry(state: AgentState) -> AgentState:
    return {**state, "retry_count": state.get("retry_count", 0) + 1}


# ── Build the Graph ───────────────────────────────────────────────────────────
def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("query_analyzer", query_analyzer_node)
    graph.add_node("retriever", retriever_node)
    graph.add_node("fact_verifier", fact_verifier_node)
    graph.add_node("increment_retry", increment_retry)
    graph.add_node("conflict_detector", conflict_detector_node)
    graph.add_node("synthesizer", synthesizer_node)

    graph.set_entry_point("query_analyzer")
    graph.add_edge("query_analyzer", "retriever")
    graph.add_edge("retriever", "fact_verifier")

    graph.add_conditional_edges(
        "fact_verifier",
        should_retry_or_proceed,
        {
            "retry": "increment_retry",
            "proceed": "conflict_detector",
        },
    )
    graph.add_edge("increment_retry", "retriever")
    graph.add_edge("conflict_detector", "synthesizer")
    graph.add_edge("synthesizer", END)

    return graph.compile()


# Singleton compiled graph
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


# ── Conversation Memory Store (in-process, per conversation_id) ──────────────
_conversation_store: dict[str, list[BaseMessage]] = {}
MAX_HISTORY = 10  # keep last 10 messages (5 turns)


def run_agent(
    question: str,
    document_ids: Optional[list[str]] = None,
    conversation_id: Optional[str] = None,
) -> dict:
    """Public entry point. Returns the final agent state dict."""
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    # Load conversation history
    history = _conversation_store.get(conversation_id, [])[-MAX_HISTORY:]

    initial_state: AgentState = {
        "question": question,
        "document_ids": document_ids,
        "conversation_id": conversation_id,
        "messages": history,
        "query_type": "",
        "retrieved_docs": [],
        "context_string": "",
        "retry_count": 0,
        "answer": "",
        "sources": [],
        "conflicts": [],
        "confidence": 0.0,
    }

    graph = get_graph()
    final_state = graph.invoke(initial_state)

    # Persist updated conversation memory
    _conversation_store[conversation_id] = final_state.get("messages", [])

    return final_state


# ── Stage-by-stage streaming for SSE endpoint ─────────────────────────────────
_NODE_LABELS = {
    "query_analyzer": "Analyzing query type",
    "retriever": "Searching documents (Hybrid: BM25 + ChromaDB → RRF)",
    "fact_verifier": "Verifying context sufficiency",
    "increment_retry": "Broadening search query for retry",
    "conflict_detector": "Checking for cross-document contradictions",
    "synthesizer": "Generating verified answer with citations",
}


def run_agent_with_stages(
    question: str,
    document_ids: Optional[list[str]] = None,
    conversation_id: Optional[str] = None,
):
    """
    Generator that yields (event_type, payload) tuples as the pipeline
    progresses through each LangGraph node.

    Used by POST /query/stream for real-time SSE updates.
    """
    if not conversation_id:
        conversation_id = str(uuid.uuid4())

    history = _conversation_store.get(conversation_id, [])[-MAX_HISTORY:]

    initial_state: AgentState = {
        "question": question,
        "document_ids": document_ids,
        "conversation_id": conversation_id,
        "messages": history,
        "query_type": "",
        "retrieved_docs": [],
        "context_string": "",
        "retry_count": 0,
        "answer": "",
        "sources": [],
        "conflicts": [],
        "confidence": 0.0,
    }

    graph = get_graph()

    # LangGraph's .stream() yields state updates per node
    final_state = initial_state
    for step in graph.stream(initial_state):
        for node_name, node_output in step.items():
            label = _NODE_LABELS.get(node_name, node_name)
            detail = {}

            # Add useful context per stage
            if node_name == "query_analyzer":
                detail["query_type"] = node_output.get("query_type", "")
            elif node_name == "retriever":
                docs = node_output.get("retrieved_docs", [])
                detail["doc_count"] = len(docs)
            elif node_name == "fact_verifier":
                detail["confidence"] = node_output.get("confidence", 0.0)
            elif node_name == "conflict_detector":
                conflicts = node_output.get("conflicts", [])
                detail["conflict_count"] = len(conflicts)

            yield ("stage", {"node": node_name, "status": label, "detail": detail})
            final_state = {**final_state, **node_output}

    # Persist conversation memory
    _conversation_store[conversation_id] = final_state.get("messages", [])

    # Emit final answer
    yield ("answer", {
        "answer": final_state.get("answer", ""),
        "sources": final_state.get("sources", []),
        "conflicts": final_state.get("conflicts", []),
        "confidence": final_state.get("confidence", 0.0),
        "query_type": final_state.get("query_type", "factual"),
        "conversation_id": final_state.get("conversation_id", ""),
    })
