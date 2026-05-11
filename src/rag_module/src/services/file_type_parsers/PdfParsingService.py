import os
import fitz
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PdfParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pdf"

    def _extract_sentences(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        sentences = []
        sentence_index = 0

        try:
            doc = fitz.open(path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {filename}: {str(e)}")

        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text().strip()

            # skip noise pages
            if self._is_noise(text):
                continue

            # split page text into individual lines
            # each non-noise line becomes one sentence unit
            lines = text.split("\n")
            for line in lines:
                line = line.strip()
                if self._is_noise(line):
                    continue

                sentences.append({
                    "text": line,
                    "index": sentence_index
                })

                sentence_index = sentence_index + 1

        doc.close()
        return sentences