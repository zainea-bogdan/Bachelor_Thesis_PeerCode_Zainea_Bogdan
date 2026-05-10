from fastapi import FastAPI
from src.routers.ingestion_router import router as ingestion_router
from src.routers.retrieval_router import router as retrieval_router


app = FastAPI()

app.include_router(ingestion_router)
app.include_router(retrieval_router)
