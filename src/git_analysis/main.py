from fastapi import FastAPI
from src.routers.user_data_router import router as user_router
from src.routers.repo_data_routers.repo_data_router import router as repo_router
from src.routers.metrics_data_router import router as metrics_router
from src.routers.thresholds_router import router as thresholds_router

app = FastAPI()

app.include_router(user_router, prefix="/api")
app.include_router(repo_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(thresholds_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Hello World"}