import chromadb
import os
from dotenv import load_dotenv
load_dotenv()

class ChromaDBClient:
    CHROMA_PATH = os.getenv("CHROMA_PATH")
    COLLECTION_NAME = "courses_materials"

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=self.CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )