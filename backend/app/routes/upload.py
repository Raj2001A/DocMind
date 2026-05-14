"""
upload.py  —  POST /upload
"""
import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, BackgroundTasks
from app.config import settings
from app.models.schemas import UploadResponse
from app.services.ingestion import ingest_document
from app.models.db import save_document, update_document_chunks_and_status

router = APIRouter(prefix="/api", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}


def background_ingest(file_path: Path, filename: str, document_id: str):
    try:
        result = ingest_document(file_path, filename, existing_doc_id=document_id)
        update_document_chunks_and_status(document_id, result["chunk_count"], "ready")
    except Exception as e:
        import logging
        logging.error(f"Background ingestion failed for {document_id}: {e}")
        update_document_chunks_and_status(document_id, 0, "error")


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File has no name.")

    safe_name = re.sub(r'[^\w\s.\-()]', '_', Path(file.filename).name).strip()
    if not safe_name:
        safe_name = "uploaded_file"

    suffix = Path(safe_name).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: PDF, DOCX.",
        )

    document_id = str(uuid.uuid4())[:12]
    upload_path = Path(settings.upload_dir) / f"{document_id}{suffix}"
    
    try:
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {e}")

    # Save to SQLite with 'processing' status
    save_document(document_id, safe_name, 0, status="processing")

    # Queue ingestion
    background_tasks.add_task(background_ingest, upload_path, safe_name, document_id)

    return UploadResponse(
        document_id=document_id,
        filename=safe_name,
        chunk_count=0,
        status="processing",
        message=f"'{safe_name}' is being processed in the background.",
    )


@router.get("/documents")
async def list_documents():
    from app.models.db import get_documents
    return {"documents": get_documents()}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    from app.models.db import delete_document as db_delete

    # Remove from ChromaDB vector store
    try:
        from app.services.ingestion import get_vectorstore
        vs = get_vectorstore()
        # Get all chunk IDs for this document
        results = vs.get(where={"document_id": document_id})
        if results and results.get("ids"):
            vs.delete(ids=results["ids"])
    except Exception as e:
        pass  # ChromaDB cleanup is best-effort

    deleted = db_delete(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"message": "Document deleted.", "document_id": document_id}
