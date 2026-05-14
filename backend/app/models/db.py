"""
db.py
-----
Lightweight SQLite store for RAGAS evaluation scores.
No ORM — raw sqlite3 keeps the dependency footprint tiny.
"""
import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

DB_PATH = Path("./docmind.db")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS eval_scores (
            run_id           TEXT PRIMARY KEY,
            timestamp        TEXT NOT NULL,
            answer_relevancy REAL,
            faithfulness     REAL,
            context_precision REAL,
            context_recall   REAL,
            question_count   INTEGER,
            raw_json         TEXT
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            document_id  TEXT PRIMARY KEY,
            filename     TEXT NOT NULL,
            chunk_count  INTEGER,
            uploaded_at  TEXT NOT NULL
        )
        """)


def save_eval_score(scores: dict, question_count: int) -> str:
    run_id = str(uuid.uuid4())
    with _conn() as conn:
        conn.execute(
            """INSERT INTO eval_scores VALUES (?,?,?,?,?,?,?,?)""",
            (
                run_id,
                datetime.utcnow().isoformat(),
                scores.get("answer_relevancy", 0.0),
                scores.get("faithfulness", 0.0),
                scores.get("context_precision", 0.0),
                scores.get("context_recall", 0.0),
                question_count,
                json.dumps(scores),
            ),
        )
    return run_id


def get_eval_history(limit: int = 10) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM eval_scores ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def save_document(document_id: str, filename: str, chunk_count: int) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO documents VALUES (?,?,?,?)",
            (document_id, filename, chunk_count, datetime.utcnow().isoformat()),
        )


def get_documents() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM documents ORDER BY uploaded_at DESC").fetchall()
    return [dict(r) for r in rows]


def delete_document(document_id: str) -> bool:
    with _conn() as conn:
        cursor = conn.execute("DELETE FROM documents WHERE document_id = ?", (document_id,))
        return cursor.rowcount > 0
