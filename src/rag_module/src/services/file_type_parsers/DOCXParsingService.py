import os
from docx import Document
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class DocxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "docx"

    def parse(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        doc = Document(path)

        # detect headings — determines which strategy to use
        headings_found = [
            p for p in doc.paragraphs
            if p.style and p.style.name.startswith("Heading")
            and p.text.strip()
        ]

        if len(headings_found) > 0:
            # case 1 — document has headings
            # deterministic heading-based chunking
            # no overlap needed — heading boundaries are clean separators
            return self._chunk_by_headings(doc, filename)
        else:
            # case 2 — plain text block, no headings
            # fall back to sentence-level chunking with overlap
            return self._chunk_by_plain_text(doc, filename)

    # ── case 1 — heading-based chunking ──────────────────────

    def _chunk_by_headings(
        self,
        doc: Document,
        filename: str
    ) -> list[dict]:

        chunks = []
        chunk_index = 0
        current_heading = None
        current_paragraphs = []

        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()

            if self._is_noise(text):
                continue

            if paragraph.style and paragraph.style.name.startswith("Heading"):
                # flush previous section before starting new one
                if len(current_paragraphs) > 0:
                    section_chunks = self._flush_heading_section(
                        heading=current_heading,
                        paragraphs=current_paragraphs,
                        filename=filename,
                        chunk_index_start=chunk_index
                    )
                    for chunk in section_chunks:
                        chunks.append(chunk)
                    chunk_index = chunk_index + len(section_chunks)

                current_heading = text
                current_paragraphs = []

            else:
                current_paragraphs.append(text)

        # flush final section
        if len(current_paragraphs) > 0:
            section_chunks = self._flush_heading_section(
                heading=current_heading,
                paragraphs=current_paragraphs,
                filename=filename,
                chunk_index_start=chunk_index
            )
            for chunk in section_chunks:
                chunks.append(chunk)

        return chunks

    def _flush_heading_section(
        self,
        heading: str,
        paragraphs: list[str],
        filename: str,
        chunk_index_start: int
    ) -> list[dict]:

        # build full section text with heading prefix
        if heading is not None:
            full_text = heading + "\n\n" + " ".join(paragraphs)
        else:
            full_text = " ".join(paragraphs)

        word_count = len(full_text.split())

        # fits within ceiling — emit as one chunk
        if word_count <= self.SECTION_WINDOW:
            return [self._build_chunk(
                text=full_text,
                filename=filename,
                chunk_index=chunk_index_start,
                strategy="heading_chunking"
            )]

        # too large — split into windows
        return self._split_into_windows(
            text=full_text,
            filename=filename,
            chunk_index_start=chunk_index_start,
            strategy="heading_chunking_split"
        )

    # ── case 2 — plain text chunking with overlap ─────────────

    def _chunk_by_plain_text(
        self,
        doc: Document,
        filename: str
    ) -> list[dict]:

        # collect all paragraph texts into one string
        paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if not self._is_noise(text):
                paragraphs.append(text)

        full_text = " ".join(paragraphs)

        # delegate to base class sentence chunking with overlap
        return self._chunk_by_sentences_with_overlap(
            full_text=full_text,
            filename=filename,
            chunk_index_start=0
        )

    # ── shared split utility ──────────────────────────────────

    def _split_into_windows(
        self,
        text: str,
        filename: str,
        chunk_index_start: int,
        strategy: str
    ) -> list[dict]:

        all_words = text.split()
        chunks = []
        chunk_index = chunk_index_start
        position = 0

        while position < len(all_words):
            window_words = all_words[position: position + self.SECTION_WINDOW]
            chunk_text = " ".join(window_words)

            chunks.append(self._build_chunk(
                text=chunk_text,
                filename=filename,
                chunk_index=chunk_index,
                strategy=strategy
            ))

            chunk_index = chunk_index + 1
            position = position + self.SECTION_WINDOW

        return chunks