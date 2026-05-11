import os
import numpy as np
import nltk
from abc import ABC, abstractmethod
from sentence_transformers.util import cos_sim
from src.services.rag_services.EmbeddingModel import EmbeddingModel

# download nltk sentence tokenizer on first run
nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)


class BaseParsingService(ABC):

    # 95th percentile of cosine distances as boundary threshold
    # justified by: Analysis of Chunking Process in RAG Architectures
    # (IEEE AINIT 2025) and Optimising retrieval performance in RAG
    # systems (ScienceDirect 2025)
    DISTANCE_PERCENTILE = 95

    # soft token ceiling — preferred chunk size
    # justified by: coordinator feedback — ~1000 tokens per chunk
    SOFT_CEILING = 1000

    # hard token ceiling — maximum allowed with soft overflow
    # 20% buffer above soft ceiling for semantically continuous sentences
    HARD_CEILING = 1200

    def __init__(self):
        # get shared embedding model instance — Singleton pattern
        # model loaded once, reused across all parsing services
        self.embedding_model = EmbeddingModel.get_instance()

    # ── abstract method — subclasses must implement ──────────

    @abstractmethod
    def _extract_text(self, path: str) -> str:
        # each subclass extracts full document text
        # using its own parsing library
        # returns one complete string — no chunking here
        pass

    @abstractmethod
    def _get_document_type(self) -> str:
        # each subclass returns its document type string
        # used in chunk metadata
        pass

    # ── public entry point ────────────────────────────────────

    def parse(self, path: str) -> list[dict]:

        # step 1 — extract full text from document
        # format-specific — delegated to subclass
        print(f"Extracting text from {os.path.basename(path)}...")
        full_text = self._extract_text(path)

        if not full_text or len(full_text.strip()) == 0:
            print("No text extracted — document may be empty or image-only.")
            return []

        # step 2 — split into linguistic sentences using nltk
        # this is the key difference from word-window chunking
        # nltk detects actual sentence boundaries, not formatting units
        print("Splitting into sentences via nltk...")
        raw_sentences = nltk.sent_tokenize(full_text)

        # step 3 — filter noise sentences
        sentences = []
        for sentence in raw_sentences:
            if not self._is_noise(sentence):
                sentences.append(sentence)

        print(f"Sentences after noise filtering: {len(sentences)}")

        if len(sentences) == 0:
            return []

        # step 4 — handle edge case: single sentence
        if len(sentences) == 1:
            return [self._build_chunk(
                text=sentences[0],
                filename=os.path.basename(path),
                chunk_index=0,
                strategy="semantic_chunking"
            )]

        # step 5 — embed all sentences in one batch
        # batching is faster than embedding one by one
        print(f"Embedding {len(sentences)} sentences for semantic analysis...")
        embeddings = self.embedding_model.encode(
            sentences,
            show_progress_bar=False
        )

        # step 6 — compute cosine distances between adjacent pairs
        # distance = 1 - cosine_similarity
        # high distance = topic changed
        # low distance = same topic continuing
        distances = []
        for i in range(len(embeddings) - 1):
            similarity = cos_sim(embeddings[i], embeddings[i + 1]).item()
            distance = 1 - similarity
            distances.append(distance)

        # step 7 — compute adaptive threshold
        # 95th percentile of distances in THIS document
        # only the top 5% most distant transitions = semantic boundaries
        # document-specific — not imposed externally
        # justified by IEEE AINIT 2025 and ScienceDirect 2025
        threshold = np.percentile(distances, self.DISTANCE_PERCENTILE)
        print(f"Adaptive boundary threshold (95th percentile): {round(threshold, 4)}")

        # step 8 — walk sentences and build semantic groups
        chunks = self._group_sentences(
            sentences=sentences,
            distances=distances,
            threshold=threshold,
            filename=os.path.basename(path)
        )

        print(f"Produced {len(chunks)} semantic chunks.")
        return chunks

    # ── semantic grouping algorithm ───────────────────────────

    def _group_sentences(
        self,
        sentences: list[str],
        distances: list[float],
        threshold: float,
        filename: str
    ) -> list[dict]:

        chunks = []
        chunk_index = 0

        # accumulator for current group
        current_group = []
        current_tokens = 0

        for i in range(len(sentences)):

            sentence = sentences[i]
            sentence_tokens = len(sentence.split())

            # ── check A — token ceiling ───────────────────────
            if current_tokens + sentence_tokens > self.SOFT_CEILING:

                # soft ceiling exceeded — check if sentence
                # is still semantically continuous
                is_same_topic = (
                    i > 0 and
                    distances[i - 1] < threshold
                )
                within_hard_ceiling = (
                    current_tokens + sentence_tokens <= self.HARD_CEILING
                )

                if is_same_topic and within_hard_ceiling:
                    # same topic and within 20% buffer
                    # include this sentence then flush
                    current_group.append(sentence)
                    current_tokens = current_tokens + sentence_tokens

                    chunk_text = " ".join(current_group)
                    chunks.append(self._build_chunk(
                        text=chunk_text,
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="semantic_chunking"
                    ))
                    chunk_index = chunk_index + 1
                    current_group = []
                    current_tokens = 0

                else:
                    # different topic or over hard ceiling
                    # flush current group without this sentence
                    if len(current_group) > 0:
                        chunk_text = " ".join(current_group)
                        chunks.append(self._build_chunk(
                            text=chunk_text,
                            filename=filename,
                            chunk_index=chunk_index,
                            strategy="semantic_chunking"
                        ))
                        chunk_index = chunk_index + 1

                    # start new group with this sentence
                    current_group = [sentence]
                    current_tokens = sentence_tokens

                continue

            # ── check B — semantic boundary ───────────────────
            if i > 0 and distances[i - 1] >= threshold:

                # topic changed — flush current group
                if len(current_group) > 0:
                    chunk_text = " ".join(current_group)
                    chunks.append(self._build_chunk(
                        text=chunk_text,
                        filename=filename,
                        chunk_index=chunk_index,
                        strategy="semantic_chunking"
                    ))
                    chunk_index = chunk_index + 1

                # start new group with this sentence
                current_group = [sentence]
                current_tokens = sentence_tokens
                continue

            # ── neither — safe to accumulate ──────────────────
            current_group.append(sentence)
            current_tokens = current_tokens + sentence_tokens

        # end of document — flush remaining group
        if len(current_group) > 0:
            chunk_text = " ".join(current_group)
            chunks.append(self._build_chunk(
                text=chunk_text,
                filename=filename,
                chunk_index=chunk_index,
                strategy="semantic_chunking"
            ))

        return chunks

    # ── shared utility methods ────────────────────────────────

    def _build_chunk(
        self,
        text: str,
        filename: str,
        chunk_index: int,
        strategy: str
    ) -> dict:
        # consistent output contract for all parsers
        # this is what IngestionService expects
        chunk = {
            "text": text,
            "metadata": {
                "source_filename": filename,
                "document_type": self._get_document_type(),
                "chunk_index": chunk_index,
                "strategy_used": strategy
            }
        }
        return chunk

    @staticmethod
    def _is_noise(text: str) -> bool:
        # empty string
        if not text:
            return True
        # fewer than 3 words — page numbers, labels, single words
        words = text.split()
        if len(words) < 3:
            return True
        return False