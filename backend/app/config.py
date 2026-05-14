"""
config.py
---------
Centralised settings using pydantic-settings.
All values are loaded from environment variables / .env file.

LLM_PROVIDER controls which LLM + embedding backend to use:
  "openai"  → OpenAI GPT + text-embedding-3-small  (requires OPENAI_API_KEY)
  "gemini"  → Google Gemini + text-embedding-004    (requires GEMINI_API_KEY)
  "ollama"  → Local Ollama                          (requires Ollama running)
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LLM Provider ---------------------------------------------------------
    # Set to "openai", "gemini", or "ollama"
    llm_provider: str = "gemini"

    # --- OpenAI ---------------------------------------------------------------
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # --- Google Gemini --------------------------------------------------------
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    gemini_embedding_model: str = "models/text-embedding-004"

    # --- Groq (Free / Fast Llama models) --------------------------------------
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- Ollama (local LLM fallback) ------------------------------------------
    use_local_llm: bool = False          # legacy flag — prefer llm_provider
    ollama_model: str = "llama3"
    ollama_base_url: str = "http://localhost:11434"

    # --- Vector DB ------------------------------------------------------------
    chroma_persist_dir: str = "./chroma_db"

    # --- Ingestion ------------------------------------------------------------
    chunk_size: int = 512          # tokens per chunk
    chunk_overlap: int = 50        # token overlap between chunks
    retrieval_k: int = 6           # top-k documents per search

    # --- App ------------------------------------------------------------------
    app_title: str = "DocMind"
    # In production, set CORS_ORIGINS env var as a comma-separated list:
    # e.g.  CORS_ORIGINS=https://docmind.onrender.com,https://www.docmind.app
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]
    upload_dir: str = "./uploads"


settings = Settings()

# Ensure directories exist
Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
