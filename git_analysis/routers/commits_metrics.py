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
        metrics_data["total_number_of_merge_commits"]=commits_data.get("count")-len(non_merge_commits_list)
        metrics_data["ratio_real_commits"]= metrics_data["total_number_of_real_commits"]/( metrics_data["total_number_of_real_commits"]+metrics_data["total_number_of_merge_commits"])
       
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

        #calculating the biggest gap of active days.
        max_days_gap=0
        list_days_gaps=[]
        list_dates=sorted(list(unique_date_values))
        for i in range(len(list_dates)):
            if i!=0:
                list_days_gaps.append((list_dates[i]-list_dates[i-1]).days )
                if (list_dates[i]-list_dates[i-1]).days > max_days_gap:
                    max_days_gap=(list_dates[i]-list_dates[i-1]).days
            else:
                continue
        
        metrics_data["largest_inactivity_gap_days"]=max_days_gap
        metrics_data["days_gaps_sorted"]=list_days_gaps

        #ratio of commits in last days.
        counter_last_day_commits=0
        commits_per_day = {}
        deadline_data_ajustata = datetime.strptime(deadline_data, "%Y-%m-%d").date()
        for com in non_merge_commits_list:
            if com.get("commit_committer_date"):
                commit_date = datetime.strptime(
                    com.get("commit_committer_date"),
                    "%Y-%m-%dT%H:%M:%SZ"
                ).date()
            # for deadline calculation
            if commit_date == deadline_data_ajustata:
                    counter_last_day_commits += 1
            #for max day commits ratio
            if commit_date in commits_per_day:
                commits_per_day[f"{commit_date}"]+=1
            else:
                commits_per_day[f"{commit_date}"]=1

        metrics_data["ratio_last_day_commits"]=counter_last_day_commits/metrics_data["total_number_of_real_commits"]


        if  metrics_data["total_number_of_real_commits"] == 0:
            metrics_data["max_day_commits_ratio"] = 0
        else:
            max_commits_one_day = max(commits_per_day.values(), default=0)
            metrics_data["max_day_commits_ratio"] = (
                max_commits_one_day / metrics_data["total_number_of_real_commits"]
            )


        #trying to evaluate the distribution of the activity over the days register in commit history:
        if metrics_data["total_number_of_real_commits"]<=1:
            metrics_data["activity_distribution_ratio"]=0
        elif metrics_data["activity_span_days"]==0:   
            metrics_data["activity_distribution_ratio"]=0
        else:
            metrics_data["activity_distribution_ratio"]=metrics_data["active_days"]/(metrics_data["activity_span_days"]+1)

        metrics_resume={
            "repo": repo,
            "category": category_of_metrics,
            "total_commits_including_merge_ones":commits_data.get("count"),
            "deadline": blueprint_project_deadline,
            "metrics": metrics_data 
        }

        #extra info about dates:
        metadata_dates = {}

        metadata_dates["first_commit_date"] = first_commit_date
        metadata_dates["last_commit_date"] = last_commit_date 
        metadata_dates["number_of_days_started_before_deadline"] = (deadline_data_ajustata-first_commit_date).days

        #flags:
        flags=[]
        #low commit activity
        if metrics_data["total_number_of_real_commits"]<3:
            flag_low_commit_activity={
                "name":"LOW_ACTIVITY_DISTRIBUTION",
                "description":f"The student had only {metrics_data["total_number_of_real_commits"]} real commits (excluding merge ones)."
            }
            flags.append(flag_low_commit_activity)
        
        #flag last minute activity:
        if metrics_data["ratio_last_day_commits"] > 0.5:
            flag_last_minute_activity={
                "name":"LAST_MINUTE_ACTIVITY",
                "description":f"The student had {metrics_data["ratio_last_day_commits"]*100}% of commits done in last day"
            }
            flags.append(flag_last_minute_activity)

        #flag HIGH_SAME_DAY_CONCENTRATION:
        if metrics_data["max_day_commits_ratio"] > 0.6:
            flag_high_same_day_activity={
                "name":"HIGH_SAME_DAY_CONCENTRATION",
                "description":f"The student had {metrics_data["max_day_commits_ratio"]*100}% of commits done in one day"
            }
            flags.append(flag_high_same_day_activity)

        #flag LONG_INACTIVITY_GAP:
        if metrics_data["largest_inactivity_gap_days"] >= 7:
            flag_long_inactivity_gap={
                "name":"LONG_INACTIVITY_GAP",
                "description":f"The student had a big break from commiting, consisting of {metrics_data["largest_inactivity_gap_days"]} days without work."
            }
            flags.append(flag_long_inactivity_gap)

        #flag LATE_START_PATTERN
        if metadata_dates["number_of_days_started_before_deadline"] < 3:
            flag_late_start={
                "name":"LATE_START_PATTERN",
                "description":f"The student have started working on this project {   metadata_dates["number_of_days_started_before_deadline"]} days before deadline"
            }
            flags.append(flag_late_start)

        return{
            "status":"success",
            "commits_analysis_resume":metrics_resume,
            "flags":flags,
            "metadata_dates":metadata_dates,
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