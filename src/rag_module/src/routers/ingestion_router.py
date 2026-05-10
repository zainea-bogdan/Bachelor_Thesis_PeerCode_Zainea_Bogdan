import os
import shutil
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from src.services.IngestionService import IngestionService


router = APIRouter()
ingestion_service = IngestionService()


@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    teacher_id: str = Form(...),
    university_year: str = Form(...)
):
    # step 1 — validate file extension before doing anything
    
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in [".pdf", ".docx", ".pptx"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. Supported: .pdf .docx .pptx"
        )

    tmp_path = None

    try:
        # step 2 — save uploaded file stream to a temp file on disk
        # parsers need a file path, not a stream
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension
        ) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # step 3 — call ingestion service with file path + metadata
        result = ingestion_service.ingest_document(
            file_path=tmp_path,
            course_id=course_id,
            teacher_id=teacher_id,
            university_year=university_year
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        # step 4 — always clean up temp file
        # runs whether the request succeeded or failed
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.delete("/ingest/clear")
def clear_collection():
    try:
        # get all IDs in the collection
        all_items = ingestion_service.chroma.collection.get()
        all_ids = all_items["ids"]

        if len(all_ids) == 0:
            return {"status": "already empty", "deleted": 0}

        # delete all chunks
        ingestion_service.chroma.collection.delete(ids=all_ids)

        return {
            "status": "success",
            "deleted": len(all_ids),
            "message": "ChromaDB collection cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))