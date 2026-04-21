from fastapi import APIRouter, HTTPException, Query
from src.services.CommitsService import CommitsService

router = APIRouter()
commits_service = CommitsService()

@router.get("/user/{username}/repos/{repo_name}/commits")
def get_all_commits(
    username: str,
    repo_name: str,
    start_date: str = Query(...),
    deadline: str = Query(...)
):
    try:
        return commits_service.get_all_commits(username, repo_name, start_date, deadline)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user/{username}/repos/{repo_name}/commits/{commit_sha}")
def get_one_commit(username: str, repo_name: str, commit_sha: str):
    try:
        return commits_service.get_one_commit(username, repo_name, commit_sha)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))