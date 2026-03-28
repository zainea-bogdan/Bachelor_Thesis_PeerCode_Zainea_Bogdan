from fastapi import FastAPI
from routers import userInfo,repoInfo,metrics
app = FastAPI()

app.include_router(userInfo.router)
app.include_router(repoInfo.router)
app.include_router(metrics.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}