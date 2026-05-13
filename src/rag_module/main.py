from contextlib import asynccontextmanager
from fastapi import FastAPI
from src.routers.ingestion_router import router as ingestion_router
from src.routers.retrieval_router import router as retrieval_router
from src.services.rag_services.EmbeddingModel import EmbeddingModel
from src.services.rag_services.ReRankerModel import ReRankerModel


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading embedding model...")
    EmbeddingModel.get_instance()
    print("Loading re-ranker model...")
    ReRankerModel.get_instance()
    print("Models ready.")
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(ingestion_router)
app.include_router(retrieval_router)
