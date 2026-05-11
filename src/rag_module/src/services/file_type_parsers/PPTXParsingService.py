import os
from pptx import Presentation
from src.services.file_type_parsers.BaseParsingService import BaseParsingService


class PptxParsingService(BaseParsingService):

    def _get_document_type(self) -> str:
        return "pptx"

    def parse(self, path: str) -> list[dict]:
        filename = os.path.basename(path)

        # step 1 — open the presentation
        try:
            presentation = Presentation(path)
        except Exception as e:
            raise Exception(f"Failed to open PPTX {filename}: {str(e)}")

        chunks = []
        chunk_index = 0

        # step 2 — iterate every slide
        # each slide is treated as one discrete semantic unit
        # slides are designed to be self-contained — no overlap needed
        # coordinator justification: slide boundaries are already
        # clean semantic separators by design
        for slide_index in range(len(presentation.slides)):
            slide = presentation.slides[slide_index]

            # step 3 — collect all shape texts on this slide
            shape_texts = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    text = shape.text.strip()
                    if not self._is_noise(text):
                        shape_texts.append(text)

            # skip slide if no meaningful text found
            if len(shape_texts) == 0:
                continue

            # step 4 — build slide text with slide number prefix
            # slide number embedded in text for traceability
            # same pattern as original implementation
            slide_number = slide_index + 1
            slide_text = f"Slide {slide_number}\n\n" + " ".join(shape_texts)

            # step 5 — check word ceiling
            # slides are usually well under 1000 words
            # safety net for unusually dense slides
            word_count = len(slide_text.split())

            if word_count <= self.SECTION_WINDOW:
                # fits within ceiling — one slide = one chunk
                chunks.append(self._build_chunk(
                    text=slide_text,
                    filename=filename,
                    chunk_index=chunk_index,
                    strategy="slide_chunking"
                ))
                chunk_index = chunk_index + 1

            else:
                # unusually large slide — split into windows
                # rare in practice but handled for robustness
                window_chunks = self._split_into_windows(
                    text=slide_text,
                    filename=filename,
                    chunk_index_start=chunk_index,
                    strategy="slide_chunking_split"
                )
                for chunk in window_chunks:
                    chunks.append(chunk)
                chunk_index = chunk_index + len(window_chunks)

        return chunks

    # ── split utility for oversized slides ───────────────────

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