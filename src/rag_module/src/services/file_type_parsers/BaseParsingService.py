from abc import ABC, abstractmethod
import os
from src.services.rag_services.EmbeddingModel import EmbeddingModel
from sentence_transformers.util import cos_sim
from dotenv import load_dotenv

load_dotenv()

class BaseParsingService(ABC):

    # maximum words per chunk — coordinator feedback: ~1000 tokens
    # 1000 tokens ≈ 750 words in English technical text
    SECTION_WINDOW = 750

    # semantic similarity threshold
    # below this value between adjacent sentences = topic boundary
    # justified by: RAG chunking literature — typical range 0.4-0.6
    SIMILARITY_THRESHOLD = 0.5

    def __init__(self):
        # load embedding model once per parser instance
        # used to detect semantic boundaries between sentences
        self.embedding_model = EmbeddingModel.get_instance()
  

    # ── abstract method — subclasses must implement ──────────

    @abstractmethod
    def _extract_sentences(self, path: str) -> list[dict]:
        # each subclass extracts sentences from its own format
        # must return list of:
        # { "text": str, "index": int }
        pass

    # ── public entry point ────────────────────────────────────

    def parse(self, path: str) -> list[dict]:
        # step 1 — extract sentences from document
        # format-specific — delegated to subclass
        sentences = self._extract_sentences(path)

        # step 2 — filter noise sentences
        clean_sentences = []
        for sentence in sentences:
            if not self._is_noise(sentence["text"]):
                clean_sentences.append(sentence)

        # step 3 — check we have something to work with
        if len(clean_sentences) == 0:
            return []

        # step 4 — semantic chunking
        # groups sentences into semantically coherent chunks
        chunks = self._semantic_chunk(
            sentences=clean_sentences,
            filename=os.path.basename(path)
        )

        return chunks

    # ── shared semantic chunking logic ────────────────────────

    def _semantic_chunk(
        self,
        sentences: list[dict],
        filename: str
    ) -> list[dict]:

        # step 1 — handle edge case: only one sentence
        if len(sentences) == 1:
            return [self._build_chunk(
                text=sentences[0]["text"],
                filename=filename,
                chunk_index=0,
                strategy="semantic_chunking"
            )]

        # step 2 — embed all sentences in one batch
        # batching is faster than embedding one by one
        sentence_texts = []
        for sentence in sentences:
            sentence_texts.append(sentence["text"])

        print(f"Embedding {len(sentence_texts)} sentences for semantic analysis...")
        embeddings = self.embedding_model.encode(
            sentence_texts,
            show_progress_bar=False
        )

        # step 3 — compute cosine similarity between adjacent pairs
        # sim(sentence_i, sentence_i+1) for all i
        similarities = []
        for i in range(len(embeddings) - 1):
            similarity = cos_sim(embeddings[i], embeddings[i + 1]).item()
            similarities.append(similarity)

        # step 4 — detect semantic boundaries
        # a boundary exists where similarity drops below threshold
        # meaning the topic has changed between sentence i and i+1
        boundary_indices = []
        for i in range(len(similarities)):
            if similarities[i] < self.SIMILARITY_THRESHOLD:
                boundary_indices.append(i)

        # step 5 — group sentences into chunks
        # split at boundary indices
        chunk_groups = []
        current_group = []

        for i in range(len(sentences)):
            current_group.append(sentences[i]["text"])

            # check if this position is a boundary
            if i in boundary_indices:
                chunk_groups.append(current_group)
                current_group = []

        # flush remaining sentences as final group
        if len(current_group) > 0:
            chunk_groups.append(current_group)

        # step 6 — build chunks from groups
        # apply 1000-token ceiling as safety net
        chunks = []
        chunk_index = 0

        for group in chunk_groups:
            group_text = " ".join(group)

            # check if group exceeds ceiling
            if len(group_text.split()) <= self.SECTION_WINDOW:
                # fits within limit — emit as one chunk
                chunks.append(self._build_chunk(
                    text=group_text,
                    filename=filename,
                    chunk_index=chunk_index,
                    strategy="semantic_chunking"
                ))
                chunk_index = chunk_index + 1

            else:
                # too large — split into windows
                window_chunks = self._split_into_windows(
                    text=group_text,
                    filename=filename,
                    chunk_index_start=chunk_index
                )
                for chunk in window_chunks:
                    chunks.append(chunk)
                chunk_index = chunk_index + len(window_chunks)

        return chunks

    # ── shared utility methods ────────────────────────────────

    def _split_into_windows(
        self,
        text: str,
        filename: str,
        chunk_index_start: int
    ) -> list[dict]:
        # splits oversized semantic groups into fixed windows
        # same sliding window logic as before
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
                strategy="semantic_chunking_split"
            ))

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

    def _get_document_type(self) -> str:
        # each subclass returns its document type string
        # used in metadata for ChromaDB storage
        return "unknown"

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