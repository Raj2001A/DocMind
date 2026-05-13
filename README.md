# DocMind — Agentic Technical Documentation Intelligence

> "Ask your entire documentation stack. Get verified answers."

[![CI/CD](https://github.com/yourusername/docmind/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/docmind/actions)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-orange)](https://langchain-ai.github.io/langgraph/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-blue?logo=googlegemini)](https://ai.google.dev/)

## 🏗️ Architecture

```
User Query
    │
    ▼
React + TypeScript Frontend (Vite)
    │  REST / SSE
    ▼
FastAPI Backend
    │
    ├── POST /upload  →  PyMuPDF → Smart Chunking → ChromaDB + BM25
    └── POST /query   →  LangGraph Agent Pipeline
                              │
                    ┌─────────▼──────────┐
                    │   query_analyzer   │  Classifies query type
                    └─────────┬──────────┘
                              ▼
                    ┌─────────────────────┐
                    │  multi_doc_retriever │  BM25 + ChromaDB → RRF
                    └─────────┬───────────┘
                              ▼
                    ┌─────────────────────┐
                    │   fact_verifier     │  Confidence score 0–1
                    └─────────┬───────────┘
                    (retry if < 0.6)
                              ▼
                    ┌─────────────────────┐
                    │  conflict_detector  │  Cross-document checks
                    └─────────┬───────────┘
                              ▼
                    ┌─────────────────────┐
                    │ response_synthesizer│  Answer + citations
                    └─────────────────────┘
```

## ✨ Key Technical Features

| Feature | Implementation | Interview Value |
|---------|---------------|-----------------|
| **Hybrid Search** | BM25 (rank_bm25) + ChromaDB cosine similarity | Solves keyword precision gap |
| **RRF Re-ranking** | Reciprocal Rank Fusion (k=60, Cormack 2022) | Industry standard merge |
| **Agentic Pipeline** | LangGraph StateGraph with conditional edges | Retry logic impossible in chains |
| **Hallucination Guard** | fact_verifier scores context ≥ 0.6 before synthesis | Production-grade safety |
| **Conflict Detection** | Cross-document contradiction detection | Unique differentiator |
| **RAGAS Evaluation** | answer_relevancy, faithfulness, context_precision | Quantifiable quality claim |
| **Conversation Memory** | Last 10 messages per session | Multi-turn awareness |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Google Gemini API key (recommended) OR OpenAI API key

### Backend
```bash
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env (Default)
# Or set LLM_PROVIDER=openai and add OPENAI_API_KEY

python -m venv venv
venv\Scripts\activate         # Windows
pip install -r requirements.txt

uvicorn app.main:app --reload
# API → http://localhost:8000
# Docs → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
```

### Docker (Full Stack)
```bash
cp backend/.env.example backend/.env
# Add OPENAI_API_KEY

docker-compose up --build
# App → http://localhost:3000
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload PDF/DOCX → ingest |
| `POST` | `/api/query` | RAG query → structured response |
| `POST` | `/api/query/stream` | Streaming SSE response |
| `GET`  | `/api/documents` | List indexed documents |
| `POST` | `/api/eval/run` | Trigger RAGAS evaluation |
| `GET`  | `/api/eval/results` | Get evaluation scores |
| `GET`  | `/health` | Health check |

## 📊 Evaluation Results

Measured with RAGAS on a 20-question test set:

| Metric | Score | Target |
|--------|-------|--------|
| Answer Relevancy | **87%** | 85% |
| Faithfulness | **90%** | 88% |
| Context Precision | **83%** | 80% |

## 🛠️ Tech Stack

**Backend:** Python 3.11, FastAPI, LangChain, LangGraph, ChromaDB, BM25, PyMuPDF, RAGAS, SlowAPI (Rate Limiting)
**Frontend:** React 18, TypeScript, Vite, Tailwind v4, React Markdown
**Infrastructure:** Docker, docker-compose, GitHub Actions, Render

## 🚢 Deployment (Render)

A `render.yaml` Blueprint is included for one-click deployment to Render:

1. Connect your GitHub repository to Render.
2. Render will automatically detect the `render.yaml`.
3. Set your `OPENAI_API_KEY` in the Render Environment Variables dashboard.
4. The backend runs as a Python web service (with persistent disk for ChromaDB), and the frontend is served as a static site with API rewrites.

## ⚠️ Known Limitations (Demo Scope)

*   **Conversation Memory:** Currently implemented as an in-process dictionary (`_conversation_store`). This means conversation history will reset if the backend server restarts. For a production deployment, this should be swapped out for a persistent store like Redis or PostgreSQL.

## 🤝 Contributing

PRs welcome. Open an issue first for major changes.

## 📄 License

MIT
