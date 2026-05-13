"""
upload.py  —  POST /upload
"""
import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import UploadResponse
from app.services.ingestion import ingest_document

router = APIRouter(prefix="/api", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File has no name.")

    # Sanitize display filename — strip path traversal and control chars
    safe_name = re.sub(r'[^\w\s.\-()]', '_', Path(file.filename).name).strip()
    if not safe_name:
        safe_name = "uploaded_file"

    # Validate file type
    suffix = Path(safe_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: PDF, DOCX.",
        )

    # Save to disk
    upload_path = Path(settings.upload_dir) / f"{uuid.uuid4()}{suffix}"
    try:
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {e}")

    # Run ingestion pipeline
    try:
        result = ingest_document(upload_path, safe_name)
    except Exception as e:
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    return UploadResponse(
        document_id=result["document_id"],
        filename=result["filename"],
        chunk_count=result["chunk_count"],
        message=f"Successfully ingested {result['chunk_count']} chunks from '{safe_name}'.",
    )


@router.get("/documents")
async def list_documents():
    from app.models.db import get_documents
    return {"documents": get_documents()}
