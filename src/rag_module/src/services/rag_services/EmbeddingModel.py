import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()


class EmbeddingModel:
    # class-level instance — shared across all users of this class
    # loaded once, reused everywhere
    _instance = None

    @classmethod
    def get_instance(cls) -> SentenceTransformer:
        if cls._instance is None:
            model_name = os.getenv("EMBEDDING_MODEL")
            if not model_name:
                raise Exception("EMBEDDING_MODEL not found in .env")
            print(f"Loading embedding model: {model_name}")
            cls._instance = SentenceTransformer(model_name)
            print("Embedding model loaded.")
        return cls._instance