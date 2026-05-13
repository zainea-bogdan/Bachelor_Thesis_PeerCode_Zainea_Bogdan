import os
import requests
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PdfParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pdf"

    def parse(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        pdf_parser_url = os.getenv("PDF_PARSER_URL", "http://localhost:8001")

        try:
            with open(path, "rb") as f:
                response = requests.post(
                    f"{pdf_parser_url}/parse-pdf",
                    files={"file": (filename, f, "application/pdf")}
                )
        except Exception as e:
            raise Exception(f"Failed to reach PDF parser service: {str(e)}")

        if response.status_code != 200:
            raise Exception(
                f"PDF parser service returned {response.status_code}: {response.text}"
            )

        return response.json()["chunks"]