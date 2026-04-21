from fastapi import APIRouter, HTTPException, Query
from src.services.CommitsService import CommitsService
from src.services.CommitsMetricsService import CommitsMetricsService

router = APIRouter()
commits_service = CommitsService()
commits_metrics_service = CommitsMetricsService()


@router.get("/user/{username}/repos/{repo_name}/metrics/commits_timeline_analysis")
def get_commits_timeline_metrics(
    username: str,
    repo_name: str,
    project_start_date: str = Query(...),
    deadline: str = Query(...)
):
    try:
        commits = commits_service.get_all_commits(
            username, repo_name, project_start_date, deadline
        )
        return commits_metrics_service.analyse_commits_timeline(
            commits=commits,
            github_username=username,
            repo_name=repo_name,
            project_start_date=project_start_date,
            deadline=deadline
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
