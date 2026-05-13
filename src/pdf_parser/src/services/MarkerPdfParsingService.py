import re
import os
import tempfile
from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.output import text_from_rendered


class MarkerPdfParsingService:

    MIN_CHUNK_WORDS = 50
    MAX_CHUNK_WORDS = 750

    def __init__(self):
        print("Loading Marker models...")
        self.converter = PdfConverter(artifact_dict=create_model_dict())
        print("Marker models loaded.")

    def parse(self, file_bytes: bytes, filename: str) -> list[dict]:
        tmp_path = None
        try:
            # Marker only accepts file paths — bridge bytes to a temp file
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            rendered = self.converter(tmp_path)
            markdown, _, _ = text_from_rendered(rendered)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

        raw_blocks = markdown.split("\n\n")

        cleaned_blocks = []
        for block in raw_blocks:
            cleaned = self._strip_markdown(block.strip())
            if not self._is_noise(cleaned):
                cleaned_blocks.append(cleaned)

        return self._chunk(cleaned_blocks, filename)

    def _chunk(self, blocks: list[str], filename: str) -> list[dict]:
        chunks = []
        chunk_index = 0
        buffer = ""

        for block in blocks:
            combined = (buffer + " " + block).strip() if buffer else block
            word_count = len(combined.split())

            if word_count < self.MIN_CHUNK_WORDS:
                buffer = combined

            elif word_count > self.MAX_CHUNK_WORDS:
                if buffer:
                    chunks.append(self._build_chunk(buffer, filename, chunk_index))
                    chunk_index += 1
                buffer = block

            else:
                chunks.append(self._build_chunk(combined, filename, chunk_index))
                chunk_index += 1
                buffer = ""

        if buffer:
            chunks.append(self._build_chunk(buffer, filename, chunk_index))

        return chunks

    def _build_chunk(self, text: str, filename: str, chunk_index: int) -> dict:
        return {
            "text": text,
            "metadata": {
                "source_filename": filename,
                "document_type": "pdf",
                "chunk_index": chunk_index,
                "strategy_used": "marker_paragraph_chunking"
            }
        }

    @staticmethod
    def _strip_markdown(text: str) -> str:
        text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", text)
        text = re.sub(r"`(.+?)`", r"\1", text)
        return text.strip()

    @staticmethod
    def _is_noise(text: str) -> bool:
        if not text:
            return True
        if len(text.split()) < 3:
            return True
        return False