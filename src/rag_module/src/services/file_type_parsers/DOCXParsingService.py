import os
from docx import Document
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class DocxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "docx"

    def _extract_text(self, path: str) -> str:
        # open the document
        doc = Document(path)

        # collect all paragraph texts
        paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if text:
                paragraphs.append(text)

        # join into one full text string
        # nltk will handle sentence splitting in base class
        full_text = " ".join(paragraphs)
        return full_text