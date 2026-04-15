from fastapi import APIRouter,HTTPException
from datetime import datetime
from routers.repoInfo import get_all_repo_tree

router = APIRouter()

@router.get("/user/{github_username}/repos/{github_repo}/metrics/tree")
def get_structure_metrics(github_username:str,
                      github_repo: str,
                      deadline_data:str ):
    return {"message": "strucutre analysis router works"}

#health check
@router.get("/test4")
def test():
    return {"message": "strucutre analysis router works"}