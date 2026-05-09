from fastapi import FastAPI
from src.routers.ingestion_router import router as ingestion_router

app = FastAPI()

app.include_router(ingestion_router)