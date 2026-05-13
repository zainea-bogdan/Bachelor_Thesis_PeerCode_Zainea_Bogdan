from abc import ABC, abstractmethod
from src.services.rag_services.EmbeddingModel import EmbeddingModel

class BaseParsingService(ABC):

    # maximum words per chunk — coordinator feedback: ~1000 tokens
    # 1000 tokens ≈ 750-800 words in English technical text
    SECTION_WINDOW = 750

    def __init__(self):
        # get shared embedding model instance — Singleton pattern
        # model loaded once at startup, reused across all parsers
        self.embedding_model = EmbeddingModel.get_instance()

    # ── abstract methods — subclasses must implement ─────────

    @abstractmethod
    def parse(self, path: str) -> list[dict]:
        # each subclass implements its own parsing strategy
        # DOCX: heading-based or sentence-based depending on structure
        # PDF: Marker pdf parsing
        # PPTX: slide-based
        pass

    @abstractmethod
    def _get_document_type(self) -> str:
        # each subclass returns its document type string
        # used in chunk metadata stored in ChromaDB
        pass

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