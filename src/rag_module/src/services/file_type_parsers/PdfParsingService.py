import os
import fitz
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PdfParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pdf"

    def _extract_text(self, path: str) -> str:
        filename = os.path.basename(path)

        try:
            doc = fitz.open(path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {filename}: {str(e)}")

        # collect text from every page
        pages = []
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text().strip()
            if text:
                pages.append(text)

        doc.close()

        # join all pages into one full text string
        # nltk will handle sentence splitting in base class
        full_text = " ".join(pages)
        return full_text