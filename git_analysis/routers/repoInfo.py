from fastapi import APIRouter,HTTPException
import requests

router = APIRouter()

@router.get("/user/{github_username}/repos/{github_repo}/commits")
def get_repo_commits(github_username:str,
                      github_repo: str):
    try:
        page=1
        all_commits=[]
        curated_commits=[]
        while True:
            response = requests.get(
                f"https://api.github.com/repos/{github_username}/{github_repo}/commits",
                params={"per_page": 100, "page": page})
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Error fetching repo's commits from GitHub"
                )
            else:
                commits = response.json()
                if not commits:
                    break
                else:
                    all_commits.extend(commits)
                    page += 1


        for data in all_commits:
            commit_sha = data.get("sha")
            commit_api_url = data.get("url")
            commit_html_url = data.get("html_url")
            
            commit_author_login = data.get("author", {}).get("login")
            commit_author_id = data.get("author", {}).get("id")

            raw_author_name = data.get("commit", {}).get("author", {}).get("name")
            raw_author_email = data.get("commit", {}).get("author", {}).get("email")

            commit_committer_login = data.get("committer", {}).get("login")
            raw_committer_name = data.get("commit", {}).get("committer", {}).get("name")
            raw_committer_email = data.get("commit", {}).get("committer", {}).get("email")
            
            commit_author_date = data.get("commit", {}).get("author", {}).get("date")
            commit_committer_date = data.get("commit", {}).get("committer", {}).get("date")
            
            commit_message = data.get("commit", {}).get("message")
            commit_comment_count = data.get("commit", {}).get("comment_count")
            parent_count = len(data.get("parents", []))
            is_merge_commit = len(data.get("parents", [])) > 1
            is_verified = data.get("commit", {}).get("verification", {}).get("verified")
            verification_reason = data.get("commit", {}).get("verification", {}).get("reason")

            curated_commits.append({
                "status":"success",
                "commit_sha": commit_sha,
                "commit_api_url": commit_api_url,
                "commit_html_url": commit_html_url,

                "commit_author_login": commit_author_login,
                "commit_author_id": commit_author_id,
                "commit_author_name": raw_author_name,
                "commit_author_email": raw_author_email,

                "commit_committer_login": commit_committer_login,
                "commit_committer_name": raw_committer_name,
                "commit_committer_email": raw_committer_email,

                "commit_author_date": commit_author_date,
                "commit_committer_date": commit_committer_date,

                "commit_message": commit_message,
                "commit_comment_count": commit_comment_count,

                "parent_count": parent_count,
                "is_merge_commit": is_merge_commit,

                "is_verified": is_verified,
                "verification_reason": verification_reason
            })

        return {
            "status": "success",
            "count":len(curated_commits),
            "commits": curated_commits
            }
    except:
        return {"status":"failed",
                "error": "something went wrong fetching user data...Check terminal"}

@router.get("/user/{github_username}/repos/{github_repo}/commits/{commit_sha}")
def get_one_commit_info(github_username:str,
                      github_repo: str,
                      commit_sha: str):
    try:
        response = requests.get(f"https://api.github.com/repos/{github_username}/{github_repo}/commits/{commit_sha}")
        if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Error fetching repo's commits from GitHub"
                )
        
        data= response.json()

        commit_sha = data.get("sha")
        commit_html_url = data.get("html_url")
        
        parent_count = len(data.get("parents", []))
        is_merge_commit = len(data.get("parents", [])) > 1

        commit_total_changes = data.get("stats", {}).get("total")
        commit_additions = data.get("stats", {}).get("additions")
        commit_deletions = data.get("stats", {}).get("deletions")

        files_changed_count = len(data.get("files", []))
        files_list = data.get("files",[])

        all_files_info=[]

        for file in files_list:
            file_path = file.get("filename")
            file_status = file.get("status")
            file_additions = file.get("additions")
            file_deletions = file.get("deletions")
            file_changes = file.get("changes")
            all_files_info.append(
                {
                    "file_path":file_path,
                    "file_status":file_status,
                    "file_additions": file_additions,
                    "file_deletions":file_deletions,
                    "file_changes": file_changes
                }
            )

        curated_data = {
            "commit_sha": commit_sha,
            "commit_html_url": commit_html_url,
            "parent_count": parent_count,
            "is_merge_commit": is_merge_commit,
            "commit_total_changes": commit_total_changes,
            "commit_additions": commit_additions,
            "commit_deletions": commit_deletions,
            "files_changed_count": files_changed_count,
            "files_changed":all_files_info
        }


        return{
            "status":"success",
            "data":curated_data
        } 
    except:
        return {"status":"failed",
                "error": "something went wrong fetching user data...Check terminal"}



#health check
@router.get("/test2")
def test():
    return {"message": "repo router works"}