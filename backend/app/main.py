"""
main.py
-------
DocMind FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.models.db import init_db
from app.routes import upload, query, eval as eval_route

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("DocMind starting up...")
    init_db()
    logger.info("SQLite DB initialised")
    yield
    logger.info("DocMind shutting down")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_title,
    description="Agentic Technical Documentation Intelligence — RAG with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(query.router)
app.include_router(eval_route.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_title}


@app.get("/")
async def root():
    return {
        "service": "DocMind",
        "tagline": "Ask your entire documentation stack. Get verified answers.",
        "docs": "/docs",
        "health": "/health",
    }
