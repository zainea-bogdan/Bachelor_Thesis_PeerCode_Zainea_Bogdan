from fastapi import APIRouter, HTTPException
from src.services.RepoService import RepoService
from src.routers.repo_data_routers.commits_data_router import router as commits_router

router = APIRouter()
repo_service = RepoService()

router.include_router(commits_router)

@router.get("/user/{username}/repos")
def get_user_repos(username: str):
    try:
        return repo_service.get_user_repos(username)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/user/{username}/repos/{repo_name}")
def get_repo(username: str, repo_name: str):
    try:
        return repo_service.get_repo(username, repo_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/user/{username}/repos/{repo_name}/contributors")
def get_contributors(username: str, repo_name: str):
    try:
        return repo_service.get_repo_contributors(username, repo_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/user/{username}/repos/{repo_name}/tree")
def get_tree(username: str, repo_name: str):
    try:
        return repo_service.get_repo_tree_at_last_commit(username, repo_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))