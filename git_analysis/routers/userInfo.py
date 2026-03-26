from fastapi import APIRouter,HTTPException
import urllib.request
import requests

router = APIRouter()

@router.get("/user/{github_username}")
def get_user_info(github_username: str):
    #validation for username
    try:
        test_username = urllib.request.urlopen(f"https://github.com/{github_username}").getcode()
        if(test_username==200):
            try:
                response = requests.get(f"https://api.github.com/users/{github_username}")
                data= response.json();
                gh_username=data["login"]
                gh_profile_image=data["avatar_url"]
                gh_user_link=data["html_url"]
                gh_visibility=data["user_view_type"]
                gh_location=data["location"]
                gh_bio=data["bio"]
                gh_followers=data["followers"]
                gh_following=data["following"]
                gh_start_year=data["created_at"]
                gh_public_repos=data["public_repos"]
                return  {
                    "status": "success",
                    "username": gh_username,
                    "profile_image": gh_profile_image,
                    "profile_url": gh_user_link,
                    "visibility": gh_visibility,
                    "location": gh_location,
                    "bio": gh_bio,
                    "followers": gh_followers,
                    "following": gh_following,
                    "github_user_since:":gh_start_year,
                    "public_repos":gh_public_repos
                }
            except:
                return {"status": "failed",
                    "error": "something went wrong while fetching user data... Check terminal"}
    except:
        return {
            "status": "failed",
            "error": "Invalid link"}



@router.get("/user/{github_username}/repos")
def get_all_repos_info(github_username: str):
    #validation for username
    try:
        response = requests.get(f"https://api.github.com/users/{github_username}/repos")

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="GitHub user not found")

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Error fetching repositories from GitHub"
            )
        else:
                repos =  response.json()
                curated_repos=[]

                for data in repos:
                    repo_id = data.get("id")
                    repo_name = data.get("name")
                    repo_full_name = data.get("full_name")
                    repo_owner = data.get("owner", {}).get("login")
                    repo_html_url = data.get("html_url")

                    repo_created_at = data.get("created_at")
                    repo_updated_at = data.get("updated_at")
                    repo_pushed_at = data.get("pushed_at")

                    repo_main_language = data.get("language")
                    repo_size = data.get("size")

                    repo_is_forked = data.get("fork")
                    repo_forks_count = data.get("forks_count")  # fixed
                    repo_stars_count = data.get("stargazers_count")

                    repo_is_archived = data.get("archived")
                    repo_is_disabled = data.get("disabled")

                    repo_has_issues = data.get("has_issues")
                    repo_open_issues = data.get("open_issues")

                    repo_commits_url = data.get("commits_url", "").replace("{/sha}", "")
                    repo_contents_url = data.get("contents_url", "").replace("{+path}", "")  # fixed
                    repo_contributors_url = data.get("contributors_url")

                    repo_clone_https = data.get("clone_url")
                    repo_ssh_url = data.get("ssh_url")

                    curated_repos.append({"status":"success",
                            "repo_id": repo_id,
                            "repo_name": repo_name,
                            "repo_full_name": repo_full_name,
                            "repo_owner": repo_owner,
                            "repo_html_url": repo_html_url,
                            "repo_created_at": repo_created_at,
                            "repo_updated_at": repo_updated_at,
                            "repo_pushed_at": repo_pushed_at,
                            "repo_main_language": repo_main_language,
                            "repo_size": repo_size,
                            "repo_is_forked": repo_is_forked,
                            "repo_forks_count": repo_forks_count,
                            "repo_stars_count": repo_stars_count,
                            "repo_is_archived": repo_is_archived,
                            "repo_is_disabled": repo_is_disabled,
                            "repo_has_issues": repo_has_issues,
                            "repo_open_issues": repo_open_issues,
                            "repo_commits_url": repo_commits_url,
                            "repo_contents_url": repo_contents_url,
                            "repo_contributors_url": repo_contributors_url,
                            "repo_clone_https": repo_clone_https,
                            "repo_ssh_url": repo_ssh_url})
                return {
                "status": "success",
                "count": len(curated_repos),
                "repos": curated_repos
                }
    except:
        return {"status":"failed",
                "error": "something went wrong fetching user data...Check terminal"}



@router.get("/user/{github_username}/repos/{github_repo}")
def get_one_repo_info(github_username:str,
                      github_repo: str):
    try:
        response = requests.get(f"https://api.github.com/repos/{github_username}/{github_repo}")

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="User or Repo not found")

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Error fetching wanted repository data from GitHub"
            )
        else:
            data=response.json()
            repo_id = data.get("id")
            repo_name = data.get("name")
            repo_full_name = data.get("full_name")
            repo_owner = data.get("owner", {}).get("login")
            repo_html_url = data.get("html_url")

            repo_created_at = data.get("created_at")
            repo_updated_at = data.get("updated_at")
            repo_pushed_at = data.get("pushed_at")

            repo_main_language = data.get("language")
            repo_size = data.get("size")

            repo_is_forked = data.get("fork")
            repo_forks_count = data.get("forks_count")  # fixed
            repo_stars_count = data.get("stargazers_count")

            repo_is_archived = data.get("archived")
            repo_is_disabled = data.get("disabled")

            repo_has_issues = data.get("has_issues")
            repo_open_issues = data.get("open_issues")

            repo_commits_url = data.get("commits_url", "").replace("{/sha}", "")
            repo_contents_url = data.get("contents_url", "").replace("{+path}", "")  # fixed
            repo_contributors_url = data.get("contributors_url")

            repo_clone_https = data.get("clone_url")
            repo_ssh_url = data.get("ssh_url")

            repo_data={"status":"success",
                        "repo_id": repo_id,
                        "repo_name": repo_name,
                        "repo_full_name": repo_full_name,
                        "repo_owner": repo_owner,
                        "repo_html_url": repo_html_url,
                        "repo_created_at": repo_created_at,
                        "repo_updated_at": repo_updated_at,
                        "repo_pushed_at": repo_pushed_at,
                        "repo_main_language": repo_main_language,
                        "repo_size": repo_size,
                        "repo_is_forked": repo_is_forked,
                        "repo_forks_count": repo_forks_count,
                        "repo_stars_count": repo_stars_count,
                        "repo_is_archived": repo_is_archived,
                        "repo_is_disabled": repo_is_disabled,
                        "repo_has_issues": repo_has_issues,
                        "repo_open_issues": repo_open_issues,
                        "repo_commits_url": repo_commits_url,
                        "repo_contents_url": repo_contents_url,
                        "repo_contributors_url": repo_contributors_url,
                        "repo_clone_https": repo_clone_https,
                        "repo_ssh_url": repo_ssh_url}
            return {
            "status": "success",
            "repo_data": repo_data
            }
    except:
        return {"status":"failed",
                "error": "something went wrong fetching user data...Check terminal"}

#health check
@router.get("/test1")
def test():
    return {"message": "user router works"}

