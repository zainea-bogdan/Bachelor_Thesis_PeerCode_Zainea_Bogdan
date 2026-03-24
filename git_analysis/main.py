from fastapi import FastAPI,APIRouter
from routers import userInfo,repoInfo
app = FastAPI()

app.include_router(userInfo.router)
app.include_router(repoInfo.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}

