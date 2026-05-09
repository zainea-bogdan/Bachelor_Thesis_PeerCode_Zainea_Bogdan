import os
import fitz


class PdfParsingService:

    # sparse page threshold — below this a page is likely
    # a slide title, diagram caption or image label
    SPARSE_THRESHOLD = 30

    # buffer ceiling — prevents runaway accumulation
    # of consecutive sparse pages with no substantial page
    BUFFER_CEILING = 100

    # maximum words per chunk
    # justified by: Lost in the Middle — Liu et al. 2023
    # prevents relevant content from being buried in large chunks
    SECTION_WINDOW = 500

    def parse_pdf(self, path: str) -> list[dict]:
        filename = os.path.basename(path)
        chunks = []
        chunk_index = 0

        # rolling buffer for sparse pages
        buffer_text = []
        buffer_words = 0

        try:
            doc = fitz.open(path)
        except Exception as e:
            raise Exception(f"Failed to open PDF {filename}: {str(e)}")

        for page_index in range(len(doc)):
            page = doc[page_index]
            text = page.get_text().strip()

            # skip empty pages and image-only pages
            if self._is_noise(text):
                continue

            # count words on this page
            wc = len(text.split())

            if wc < self.SPARSE_THRESHOLD:

                # case 2 — buffer ceiling reached
                # flush buffer before accumulating this page
                if buffer_words >= self.BUFFER_CEILING:
                    flushed_chunks = self._flush_chunk(
                        text=" ".join(buffer_text),
                        filename=filename,
                        chunk_index_start=chunk_index,
                        strategy="sparse_page_chunking"
                    )
                    for chunk in flushed_chunks:
                        chunks.append(chunk)
                    chunk_index = chunk_index + len(flushed_chunks)
                    buffer_text = []
                    buffer_words = 0

                # case 1 — accumulate sparse page into buffer
                buffer_text.append(text)
                buffer_words = buffer_words + wc

            else:

                if len(buffer_text) > 0:
                    # case 4 — combine buffer + substantial page
                    # title/caption travels with its explanation
                    combined_text = " ".join(buffer_text) + " " + text
                    combined_chunks = self._flush_chunk(
                        text=combined_text,
                        filename=filename,
                        chunk_index_start=chunk_index,
                        strategy="combined_page_chunking"
                    )
                    for chunk in combined_chunks:
                        chunks.append(chunk)
                    chunk_index = chunk_index + len(combined_chunks)
                    buffer_text = []
                    buffer_words = 0

                else:
                    # case 3 — standalone substantial page
                    page_chunks = self._flush_chunk(
                        text=text,
                        filename=filename,
                        chunk_index_start=chunk_index,
                        strategy="page_chunking"
                    )
                    for chunk in page_chunks:
                        chunks.append(chunk)
                    chunk_index = chunk_index + len(page_chunks)

        doc.close()

        # case 5 — end of document, flush remaining buffer
        # any sparse pages that never found a substantial page
        if len(buffer_text) > 0:
            remaining_chunks = self._flush_chunk(
                text=" ".join(buffer_text),
                filename=filename,
                chunk_index_start=chunk_index,
                strategy="sparse_page_chunking"
            )
            for chunk in remaining_chunks:
                chunks.append(chunk)

        return chunks

    def _flush_chunk(
        self,
        text: str,
        filename: str,
        chunk_index_start: int,
        strategy: str
    ) -> list[dict]:
        # check word count against ceiling
        word_count = len(text.split())

        # fits within limit — emit as one chunk
        if word_count <= self.SECTION_WINDOW:
            return [self._build_chunk(
                text=text,
                filename=filename,
                chunk_index=chunk_index_start,
                strategy=strategy
            )]

        # too large — split into 500-word windows
        return self._split_into_windows(
            text=text,
            filename=filename,
            chunk_index_start=chunk_index_start,
            strategy=strategy
        )

    def _split_into_windows(
        self,
        text: str,
        filename: str,
        chunk_index_start: int,
        strategy: str
    ) -> list[dict]:
        # split the text into individual words
        all_words = text.split()

        chunks = []
        chunk_index = chunk_index_start

        # current position in the word list
        position = 0

        # slide a 500-word window across the words
        while position < len(all_words):

            # take the next 500 words
            # if fewer than 500 remain, take whatever is left
            window_words = all_words[position: position + self.SECTION_WINDOW]

            # join back into a string
            chunk_text = " ".join(window_words)

            # build and store this sub-chunk
            new_chunk = self._build_chunk(
                text=chunk_text,
                filename=filename,
                chunk_index=chunk_index,
                strategy=strategy + "_split"
            )
            chunks.append(new_chunk)

            # move index and position forward
            chunk_index = chunk_index + 1
            position = position + self.SECTION_WINDOW

        return chunks

    def _build_chunk(
        self,
        text: str,
        filename: str,
        chunk_index: int,
        strategy: str
    ) -> dict:
        chunk = {
            "text": text,
            "metadata": {
                "source_filename": filename,
                "document_type": "pdf",
                "chunk_index": chunk_index,
                "strategy_used": strategy
            }
        }
        return chunk

    @staticmethod
    def _is_noise(text: str) -> bool:
        if not text:
            return True
        words = text.split()
        if len(words) < 3:
            return True
        return False