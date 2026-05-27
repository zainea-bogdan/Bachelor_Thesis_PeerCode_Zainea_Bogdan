import os
import shutil
import tempfile
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from src.services.rag_services.IngestionService import IngestionService
from pydantic import BaseModel

router = APIRouter()
ingestion_service = IngestionService()

class DeleteDocumentRequest(BaseModel):
    filename: str
    course_id: str
    teacher_id: str


@router.post("/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    course_id: str = Form(...),
    teacher_id: str = Form(...),
    university_year: str = Form(...)
):
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in [".pdf", ".docx", ".pptx"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. Supported: .pdf .docx .pptx"
        )

    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension
        ) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        result = ingestion_service.ingest_document(
            file_path=tmp_path,
            course_id=course_id,
            teacher_id=teacher_id,
            university_year=university_year,
            original_filename=file.filename
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.delete("/ingest/clear")
def clear_collection():
    try:
        all_items = ingestion_service.chroma.collection.get()
        all_ids = all_items["ids"]

        if len(all_ids) == 0:
            return {"status": "already empty", "deleted": 0}

        ingestion_service.chroma.collection.delete(ids=all_ids)

        return {
            "status": "success",
            "deleted": len(all_ids),
            "message": "ChromaDB collection cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/documents")
def delete_document_chunks(body: DeleteDocumentRequest):
    try:
        results = ingestion_service.chroma.collection.get(
            where={
                "$and": [
                    {"source_filename": {"$eq": body.filename}},
                    {"course_id": {"$eq": body.course_id}},
                    {"teacher_id": {"$eq": body.teacher_id}}
                ]
            }
        )

        if not results["ids"]:
            return {
                "status": "not_found",
                "deleted": 0,
                "message": "No chunks found for this document"
            }

        ingestion_service.chroma.collection.delete(ids=results["ids"])

        return {
            "status": "success",
            "deleted": len(results["ids"]),
            "filename": body.filename
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))