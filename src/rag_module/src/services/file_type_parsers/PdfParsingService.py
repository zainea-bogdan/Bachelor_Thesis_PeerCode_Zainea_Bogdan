import os
import fitz
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PdfParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pdf"

    def parse(self, path: str) -> list[dict]:
        filename = os.path.basename(path)

        # step 1 — open the PDF
        try:
            doc = fitz.open(path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {filename}: {str(e)}")

        # step 2 — extract text from every page
        # each page returns a flat text blob — no reliable
        # structural markers available after PDF rendering
        pages = []
        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text().strip()
            if not self._is_noise(text):
                pages.append(text)

        doc.close()

        # step 3 — concatenate all pages into one full text string
        # PDF has no paragraph structure — always falls into
        # sentence-level chunking path
        full_text = " ".join(pages)

        if not full_text or len(full_text.strip()) == 0:
            return []

        # step 4 — delegate to base class sentence chunking with overlap
        # nltk splits into sentences → group by 1000 words → apply overlap
        return self._chunk_by_sentences_with_overlap(
            full_text=full_text,
            filename=filename,
            chunk_index_start=0
        )