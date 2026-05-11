import os
import nltk
from abc import ABC, abstractmethod
from src.services.rag_services.EmbeddingModel import EmbeddingModel

class BaseParsingService(ABC):

    # maximum words per chunk — coordinator feedback: ~1000 tokens
    # 1000 tokens ≈ 750-800 words in English technical text
    SECTION_WINDOW = 750

    # number of sentences to overlap between consecutive chunks
    # applied only when sentence-level chunking is used
    # justified by: RAG literature — context continuity at chunk boundaries
    OVERLAP_SENTENCES = 2

    def __init__(self):
        # get shared embedding model instance — Singleton pattern
        # model loaded once at startup, reused across all parsers
        self.embedding_model = EmbeddingModel.get_instance()

    # ── abstract methods — subclasses must implement ─────────

    @abstractmethod
    def parse(self, path: str) -> list[dict]:
        # each subclass implements its own parsing strategy
        # DOCX: heading-based or sentence-based depending on structure
        # PDF: always sentence-based with overlap
        # PPTX: slide-based
        pass

    @abstractmethod
    def _get_document_type(self) -> str:
        # each subclass returns its document type string
        # used in chunk metadata stored in ChromaDB
        pass

    # ── shared sentence-level chunking with overlap ───────────

    def _chunk_by_sentences_with_overlap(
        self,
        full_text: str,
        filename: str,
        chunk_index_start: int
    ) -> list[dict]:

        # step 1 — split full text into linguistic sentences
        raw_sentences = nltk.sent_tokenize(full_text)

        # step 2 — filter noise sentences
        sentences = []
        for sentence in raw_sentences:
            if not self._is_noise(sentence):
                sentences.append(sentence)

        if len(sentences) == 0:
            return []

        # step 3 — handle edge case: single sentence
        if len(sentences) == 1:
            return [self._build_chunk(
                text=sentences[0],
                filename=filename,
                chunk_index=chunk_index_start,
                strategy="sentence_chunking_with_overlap"
            )]

        # step 4 — group sentences into chunks
        # accumulate sentences until ceiling is reached
        groups = []
        current_group = []
        current_words = 0

        for sentence in sentences:
            sentence_words = len(sentence.split())

            if current_words + sentence_words > self.SECTION_WINDOW:
                # ceiling reached — flush current group
                if len(current_group) > 0:
                    groups.append(current_group)
                # start new group with this sentence
                current_group = [sentence]
                current_words = sentence_words
            else:
                # safe to add
                current_group.append(sentence)
                current_words = current_words + sentence_words

        # flush remaining sentences as final group
        if len(current_group) > 0:
            groups.append(current_group)

        # step 5 — apply overlap between consecutive groups
        overlapped_groups = self._apply_overlap(groups)

        # step 6 — build chunk dicts from overlapped groups
        chunks = []
        chunk_index = chunk_index_start

        for group in overlapped_groups:
            chunk_text = " ".join(group)
            chunks.append(self._build_chunk(
                text=chunk_text,
                filename=filename,
                chunk_index=chunk_index,
                strategy="sentence_chunking_with_overlap"
            ))
            chunk_index = chunk_index + 1

        return chunks

    # ── overlap post-processing ───────────────────────────────

    def _apply_overlap(
        self,
        groups: list[list[str]]
    ) -> list[list[str]]:

        # no overlap needed for single group
        if len(groups) <= 1:
            return groups

        overlapped_groups = []

        for i in range(len(groups)):

            if i == 0:
                # first group — no previous group to overlap from
                overlapped_groups.append(groups[i])
            else:
                # take last OVERLAP_SENTENCES from previous group
                previous_group = groups[i - 1]

                # handle case where previous group has fewer
                # sentences than OVERLAP_SENTENCES
                overlap_count = min(
                    self.OVERLAP_SENTENCES,
                    len(previous_group)
                )
                overlap_sentences = previous_group[-overlap_count:]

                # prepend overlap sentences to current group
                new_group = overlap_sentences + groups[i]
                overlapped_groups.append(new_group)

        return overlapped_groups

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
        # fewer than 3 words — page numbers, labels, headers
        words = text.split()
        if len(words) < 3:
            return True
        return False