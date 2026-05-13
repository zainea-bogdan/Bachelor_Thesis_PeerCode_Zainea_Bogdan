from fastapi import APIRouter, UploadFile, File, HTTPException
from src.services.MarkerPdfParsingService import MarkerPdfParsingService

router = APIRouter()
parser = MarkerPdfParsingService()


@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    chunks = parser.parse(file_bytes=file_bytes, filename=file.filename)

    return {"chunks": chunks}