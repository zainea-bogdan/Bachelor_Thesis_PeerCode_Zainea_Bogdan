import os
from docx import Document
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class DocxParsingService(BaseParsingService):

    # minimum words per chunk
    # paragraphs below this are too short for meaningful embedding
    # merged with the next paragraph
    MIN_CHUNK_WORDS = 50

    def _get_document_type(self) -> str:
        return "docx"

    def parse(self, path: str) -> list[dict]:
        filename = os.path.basename(path)

        try:
            doc = Document(path)
        except Exception as e:
            raise Exception(f"Failed to open DOCX {filename}: {str(e)}")

        # collect all paragraphs — each one is an atomic unit
        # python-docx already separates paragraphs as objects
        # no heading detection — treat all paragraphs equally
        paragraphs = []
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            if not self._is_noise(text):
                paragraphs.append(text)

        if len(paragraphs) == 0:
            return []

        # group paragraphs into chunks
        # rule 1: if combined < 50 words → buffer, wait for next
        # rule 2: if combined > 750 words → flush buffer, start fresh
        # rule 3: if combined 50-750 words → flush as chunk
        chunks = []
        chunk_index = 0
        buffer = ""

        for paragraph in paragraphs:

            # combine buffer with current paragraph
            if buffer:
                combined = buffer + " " + paragraph
            else:
                combined = paragraph

            combined_words = len(combined.split())

            if combined_words < self.MIN_CHUNK_WORDS:
                # too short — keep buffering
                buffer = combined

            elif combined_words > self.SECTION_WINDOW:
                # too long — flush buffer first if exists
                if buffer:
                    chunks.append(self._build_chunk(
                        text=buffer,
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="paragraph_chunking"
                    ))
                    chunk_index = chunk_index + 1

                # start fresh buffer with this paragraph
                buffer = paragraph

            else:
                # good size — flush combined as chunk
                chunks.append(self._build_chunk(
                    text=combined,
                    filename=filename,
                    chunk_index=chunk_index,
                    strategy="paragraph_chunking"
                ))
                chunk_index = chunk_index + 1
                buffer = ""

        # flush remaining buffer at end of document
        if buffer:
            chunks.append(self._build_chunk(
                text=buffer,
                filename=filename,
                chunk_index=chunk_index,
                strategy="paragraph_chunking"
            ))

        return chunks