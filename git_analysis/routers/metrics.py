from fastapi import APIRouter,HTTPException
from datetime import datetime
from routers.repoInfo import get_repo_commits_until_deadline


router = APIRouter()

# Commits analysis metrics.
@router.get("/user/{github_username}/repos/{github_repo}/metrics/commits/{deadline_data}")
def get_commits_metrics(github_username:str,
                      github_repo: str,
                      deadline_data:str ):
    commits_data = get_repo_commits_until_deadline(github_username=github_username,
                                    github_repo=github_repo,
                                    deadline_date=deadline_data)
    if commits_data.get("status") != "success":
        return {
            "status": "failed",
            "error": "Could not fetch commits until deadline",
            "upstream_response": commits_data
        }


    try:
        repo = github_repo
        category_of_metrics = "commits_timeline_analysis"
        blueprint_project_deadline=deadline_data

        # fiktering non-merge commits.
        non_merge_commits_list=[]

        for commit in commits_data.get("data",[]):
            if not commit.get("is_merge_commit"):
                non_merge_commits_list.append(commit)
            else:
                continue


        #calculating each metric:
        metrics_data={}
        metrics_data["total_number_of_real_commits"]=len(non_merge_commits_list)

        #extracting unique dates form the commits:
        #example of how the unique date values look like (not ai generated this comment :) )
        """
        "active_days": [
            "2025-05-13",
            "2025-05-14",
            "2025-05-15"
        ],
        """
        unique_date_values = set(datetime.strptime((com.get("commit_committer_date")), "%Y-%m-%dT%H:%M:%SZ").date() for com in non_merge_commits_list)
        metrics_data["active_days"]=len(unique_date_values)

        #activity span: extracting the last and first commit date and counting the number of days taken between.
        sorted_commits_dates = sorted(datetime.strptime((com.get("commit_committer_date")), "%Y-%m-%dT%H:%M:%SZ").date() for com in non_merge_commits_list)
        first_commit_date = sorted_commits_dates[0]
        last_commit_date=sorted_commits_dates[-1]
        metrics_data["activity_span_days"]=(last_commit_date-first_commit_date).days

        #avg commits per day:
        metrics_data["avg_number_of_real_commits_per_day"]=metrics_data["total_number_of_real_commits"]/ metrics_data["active_days"]
        
        #ratio of commits in last days.
        counter_last_day_commits=0
        deadline_data_ajustata = datetime.strptime(deadline_data, "%Y-%m-%d").date()
        for com in non_merge_commits_list:
            if com.get("commit_committer_date"):
                commit_date = datetime.strptime(
                    com.get("commit_committer_date"),
                    "%Y-%m-%dT%H:%M:%SZ"
                ).date()

            if commit_date == deadline_data_ajustata:
                    counter_last_day_commits += 1

        metrics_data["last_day_commit_ratio"]=counter_last_day_commits/metrics_data["total_number_of_real_commits"]

        
        metrics_data["same_day_concentration_ratio"]=0
        metrics_data["consistency_score"]=0

        metrics_resume={
            "repo": repo,
            "category": category_of_metrics,
            "total_commits_including_merge_ones":commits_data.get("count"),
            "deadline": blueprint_project_deadline,
            "metrics": metrics_data 
        }

        return{
            "status":"success",
            "commits_analysis_resume":metrics_resume
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }
#health check
@router.get("/test3")
def test():
    return {"message": "metrics router works"}