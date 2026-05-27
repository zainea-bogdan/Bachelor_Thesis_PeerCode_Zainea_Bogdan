from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from src.services.CommitsService import CommitsService
from src.services.CommitsMetricsService import CommitsMetricsService
from src.services.RepoService import RepoService
from src.services.StructureMetricsService import StructureMetricsService

router = APIRouter()
commits_service = CommitsService()
commits_metrics_service = CommitsMetricsService()
repo_service = RepoService()
structure_metrics_service = StructureMetricsService()


class StructureValidationRequest(BaseModel):
    expected_structure: dict[str, str]


class ThresholdsOverride(BaseModel):
    low_commit_activity: Optional[int] = None
    late_start_pattern: Optional[float] = None
    last_minute_activity: Optional[float] = None
    high_same_day_concentration: Optional[float] = None
    long_inactivity_gap_days: Optional[int] = None
    high_external_author_ratio: Optional[float] = None
    low_window_utilization: Optional[float] = None
    uneven_distribution_gini: Optional[float] = None
    erratic_commit_rhythm_hours: Optional[int] = None


@router.post("/user/{username}/repos/{repo_name}/metrics/commits_timeline_analysis")
def get_commits_timeline_metrics(
    username: str,
    repo_name: str,
    project_start_date: str = Query(...),
    deadline: str = Query(...),
    thresholds: ThresholdsOverride = None
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
            deadline=deadline,
            thresholds_override=thresholds.dict() if thresholds else None
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{username}/repos/{repo_name}/metrics/contributors_percentage")
def get_contributors_percentage(
    username: str,
    repo_name: str,
    project_start_date: str = Query(...),
    deadline: str = Query(...)
):
    try:
        commits = commits_service.get_all_commits(
            username, repo_name, project_start_date, deadline
        )
        return commits_metrics_service.analyse_contributors_percentage(
            commits=commits,
            github_username=username,
            repo_name=repo_name,
            project_start_date=project_start_date,
            deadline=deadline
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/user/{username}/repos/{repo_name}/metrics/structure_validation")
def get_structure_validation(
    username: str,
    repo_name: str,
    body: StructureValidationRequest
):
    try:
        tree = repo_service.get_repo_tree_at_last_commit(username, repo_name)
        return structure_metrics_service.validate_repo_structure(
            tree=tree,
            expected_structure=body.expected_structure,
            repo_name=repo_name,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))