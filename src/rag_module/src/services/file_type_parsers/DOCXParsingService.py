import os
from docx import Document
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class DocxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "docx"

    def _extract_sentences(self, path: str) -> list[dict]:
        # open the document
        doc = Document(path)

        sentences = []
        sentence_index = 0

        # iterate every paragraph in the document
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()

            # skip noise paragraphs
            if self._is_noise(text):
                continue

            # each paragraph becomes one sentence unit
            # for DOCX, paragraph is the natural sentence boundary
            # heading paragraphs get prefixed to signal importance
            if paragraph.style.name.startswith("Heading"):
                # heading — mark it clearly so semantic chunker
                # treats it as a strong boundary signal
                sentence_text = f"[HEADING] {text}"
            else:
                sentence_text = text

            sentences.append({
                "text": sentence_text,
                "index": sentence_index
            })

            sentence_index = sentence_index + 1

        return sentences