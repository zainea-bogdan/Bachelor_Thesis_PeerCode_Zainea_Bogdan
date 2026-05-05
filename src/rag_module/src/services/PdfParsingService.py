import os
import fitz


class PdfParsingService:

    def parse_pdf(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        chunks = []
        chunk_index = 0

        buffer_text = []
        buffer_words = 0

        try:
            doc = fitz.open(path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {filename}: {str(e)}")

        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text().strip()

            if self._is_noise(text):
                continue

            wc = len(text.split())

            if wc < 30:
                # case 2 — buffer ceiling reached, flush before accumulating
                if buffer_words >= 100:
                    chunks.append(self._build_chunk(
                        text=" ".join(buffer_text),
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="sparse_page_chunking"
                    ))
                    chunk_index += 1
                    buffer_text = []
                    buffer_words = 0

                # case 1 — accumulate into buffer
                buffer_text.append(text)
                buffer_words += wc

            else:
                if buffer_text:
                    # case 4 — combine buffer + substantial page
                    combined = " ".join(buffer_text) + " " + text
                    chunks.append(self._build_chunk(
                        text=combined,
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="combined_page_chunking"
                    ))
                    chunk_index += 1
                    buffer_text = []
                    buffer_words = 0
                else:
                    # case 3 — standalone substantial page
                    chunks.append(self._build_chunk(
                        text=text,
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="page_chunking"
                    ))
                    chunk_index += 1

        doc.close()

        # case 5 — flush remaining buffer
        if buffer_text:
            chunks.append(self._build_chunk(
                text=" ".join(buffer_text),
                filename=filename,
                chunk_index=chunk_index,
                strategy="sparse_page_chunking"
            ))

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
                "document_type": "pdf",
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