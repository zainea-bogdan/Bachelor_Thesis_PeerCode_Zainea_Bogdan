from fastapi import FastAPI
from routers import userInfo,repoInfo,commits_metrics,structure_analysis
app = FastAPI()

app.include_router(userInfo.router)
app.include_router(repoInfo.router)
app.include_router(commits_metrics.router)
app.include_router(structure_analysis.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}