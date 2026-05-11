from sentence_transformers import CrossEncoder


class ReRankerModel:

    # class-level instance — shared across all retrieval calls
    # loaded once at startup — Singleton pattern
    # consistent with EmbeddingModel Singleton
    _instance = None

    # cross-encoder model for re-ranking retrieved chunks
    # ms-marco-MiniLM-L-6-v2 — ~80MB, CPU-friendly
    # trained specifically for passage relevance scoring
    # justified by: coordinator feedback — add re-ranker after cosine similarity
    RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    @classmethod
    def get_instance(cls) -> CrossEncoder:
        if cls._instance is None:
            print(f"Loading re-ranker model: {cls.RERANKER_MODEL}")
            cls._instance = CrossEncoder(cls.RERANKER_MODEL)
            print("Re-ranker model loaded.")
        return cls._instance