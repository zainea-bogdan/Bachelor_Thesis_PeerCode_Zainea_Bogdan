from fastapi import FastAPI
from src.routers.parsing_router import router

app = FastAPI()
app.include_router(router)