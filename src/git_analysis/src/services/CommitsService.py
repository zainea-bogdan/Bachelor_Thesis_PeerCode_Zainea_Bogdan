from src.services.GithubClient import GitHubClient
import datetime



class CommitsService:

    def __init__(self):
        self.client = GitHubClient()
        self.base_url = GitHubClient.BASE_URL

    def _parse_commit(self, data: dict) -> dict:
        return{
                "commit_sha": data.get("sha"),
                "commit_tree_sha":data.get("commit", {}).get("tree", {}).get("sha"),
                "commit_api_url": data.get("url"),
                "commit_html_url": data.get("html_url"),

                "commit_author_login": data.get("author", {}).get("login"),
                "commit_author_id": data.get("author", {}).get("id"),
                "commit_author_name": data.get("commit", {}).get("author", {}).get("name"),
                "commit_author_email": data.get("commit", {}).get("author", {}).get("email"),

                "commit_committer_login": data.get("committer", {}).get("login"),
                "commit_committer_name": data.get("commit", {}).get("committer", {}).get("name"),
                "commit_committer_email": data.get("commit", {}).get("committer", {}).get("email"),

                "commit_author_date": data.get("commit", {}).get("author", {}).get("date"),
                "commit_committer_date": data.get("commit", {}).get("committer", {}).get("date"),

                "commit_message": data.get("commit", {}).get("message"),
                "commit_comment_count": data.get("commit", {}).get("comment_count"),

                "parent_count": len(data.get("parents",[])),
                "is_merge_commit": len(data.get("parents",[])) > 1,

                "is_verified": data.get("commit", {}).get("verification", {}).get("verified"),
                "verification_reason": data.get("commit", {}).get("verification", {}).get("reason"),

                "stats_additions": data.get("stats", {}).get("additions"),
                "stats_deletions": data.get("stats", {}).get("deletions"),
                "stats_total_changes": data.get("stats", {}).get("total"),
                "files_changed": [
                    {
                        "filename": f.get("filename"),
                        "status": f.get("status"),
                        "additions": f.get("additions"),
                        "deletions": f.get("deletions"),
                        "changes": f.get("changes"),
                        "patch": f.get("patch")
                    }
                    for f in data.get("files", [])
                ]
            }

    def get_all_commits(self, username: str,repo_name: str,start_date: str,deadline: str) -> list[dict]:
        start_date_iso = datetime.datetime.strptime(start_date, "%Y-%m-%d").strftime("%Y-%m-%dT23:59:59Z")
        deadline_iso = datetime.datetime.strptime(deadline, "%Y-%m-%d").strftime("%Y-%m-%dT23:59:59Z")
        all_commits = self.client.get_paginated_api_response(f"{self.base_url}/repos/{username}/{repo_name}/commits",
                                                             params={"since": start_date_iso,
                                                                     "until": deadline_iso})
        if not all_commits:
            raise Exception("No commits found in the given date range")
        return [self._parse_commit(commit) for commit in all_commits]

    def get_one_commit(self, username: str, repo_name: str,commit_sha: str) -> dict:
        data = self.client.get_simple_api_response(f"{self.base_url}/repos/{username}/{repo_name}/commits/{commit_sha}")
        return self._parse_commit(data)
