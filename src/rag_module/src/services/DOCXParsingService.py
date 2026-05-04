import os
from docx import Document


class DocxParsingService:

    def parse_docx(
        self,
        path: str,
        q1: float | None,
        q3: float | None
    ) -> list[dict]:
        if q1 is None or q3 is None:
            return self._chunk_by_paragraph(path)
        return self._chunk_by_headings(path, q1, q3)

    # ── private ──────────────────────────────────────────────

    def _chunk_by_paragraph(self, path: str) -> list[dict]:
        doc = Document(path)
        filename = os.path.basename(path)
        chunks = []
        chunk_index = 0
        current_words = []

        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if self._is_noise(text):
                continue

            current_words.extend(text.split())

            if len(current_words) >= 200:
                chunks.append(self._build_chunk(
                    text=" ".join(current_words),
                    filename=filename,
                    chunk_index=chunk_index,
                    strategy="paragraph_chunking"
                ))
                chunk_index += 1
                current_words = []

        if current_words:
            chunks.append(self._build_chunk(
                text=" ".join(current_words),
                filename=filename,
                chunk_index=chunk_index,
                strategy="paragraph_chunking"
            ))

        return chunks

    def _chunk_by_headings(
        self,
        path: str,
        q1: float,
        q3: float
    ) -> list[dict]:
        doc = Document(path)
        filename = os.path.basename(path)

        headings = [
            p for p in doc.paragraphs
            if p.style.name.startswith("Heading")
        ]

        if not headings:
            return self._chunk_by_paragraph(path)

        chunks = []
        chunk_index = 0
        current_heading = None
        current_paragraphs = []

        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if self._is_noise(text):
                continue

            if paragraph.style.name.startswith("Heading"):
                if current_paragraphs:
                    section_chunks = self._flush_section(
                        heading=current_heading,
                        paragraphs=current_paragraphs,
                        filename=filename,
                        chunk_index_start=chunk_index,
                        q3=q3
                    )
                    chunks.extend(section_chunks)
                    chunk_index += len(section_chunks)

                current_heading = text
                current_paragraphs = []
            else:
                current_paragraphs.append(text)

        if current_paragraphs:
            section_chunks = self._flush_section(
                heading=current_heading,
                paragraphs=current_paragraphs,
                filename=filename,
                chunk_index_start=chunk_index,
                q3=q3
            )
            chunks.extend(section_chunks)

        return chunks

    def _flush_section(
        self,
        heading: str | None,
        paragraphs: list[str],
        filename: str,
        chunk_index_start: int,
        q3: float
    ) -> list[dict]:
        prefix = f"{heading}\n\n" if heading else ""
        full_text = prefix + " ".join(paragraphs)
        word_count = len(full_text.split())

        if word_count <= q3:
            return [self._build_chunk(
                text=full_text,
                filename=filename,
                chunk_index=chunk_index_start,
                strategy="heading_chunking"
            )]

        return self._split_oversized_section(
            full_text=full_text,
            filename=filename,
            chunk_index_start=chunk_index_start
        )

    def _split_oversized_section(
        self,
        full_text: str,
        filename: str,
        chunk_index_start: int
    ) -> list[dict]:
        words = full_text.split()
        chunks = []
        chunk_index = chunk_index_start
        window = 500

        for i in range(0, len(words), window):
            chunk_words = words[i:i + window]
            chunks.append(self._build_chunk(
                text=" ".join(chunk_words),
                filename=filename,
                chunk_index=chunk_index,
                strategy="heading_chunking_split_oversized"
            ))
            chunk_index += 1

        return chunks

    def _build_chunk(
        self,
        text: str,
        filename: str,
        chunk_index: int,
        strategy: str
    ) -> dict:
        return {
            "text": text,
            "metadata": {
                "source_filename": filename,
                "document_type": "docx",
                "chunk_index": chunk_index,
                "strategy_used": strategy
            }
        }

    @staticmethod
    def _is_noise(text: str) -> bool:
        if not text:
            return True
        if len(text.split()) < 3:
            return True
        return False