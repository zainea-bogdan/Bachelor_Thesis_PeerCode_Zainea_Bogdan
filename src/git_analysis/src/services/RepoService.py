from src.services.GithubClient import GitHubClient

class RepoService:

    def __init__(self):
        self.client = GitHubClient()
        self.base_url = GitHubClient.BASE_URL

    def _parse_repo(self, data: dict) -> dict:
        return {
            "repo_id": data.get("id"),
            "repo_name": data.get("name"),
            "repo_full_name": data.get("full_name"),
            "repo_owner": data.get("owner", {}).get("login"),
            "repo_html_url": data.get("html_url"),
            "repo_created_at": data.get("created_at"),
            "repo_updated_at": data.get("updated_at"),
            "repo_pushed_at": data.get("pushed_at"),
            "repo_main_language": data.get("language"),
            "repo_size": data.get("size"),
            "repo_is_forked": data.get("fork"),
            "repo_forks_count": data.get("forks_count"),
            "repo_stars_count": data.get("stargazers_count"),
            "repo_is_archived": data.get("archived"),
            "repo_is_disabled": data.get("disabled"),
            "repo_has_issues": data.get("has_issues"),
            "repo_open_issues": data.get("open_issues"),
            "repo_commits_url": data.get("commits_url", "").replace("{/sha}", ""),
            "repo_contents_url": data.get("contents_url", "").replace("{+path}", ""),
            "repo_contributors_url": data.get("contributors_url"),
            "repo_clone_https": data.get("clone_url"),
            "repo_ssh_url": data.get("ssh_url")
        }

    def get_user_repos(self, username: str) -> list[dict]:
        raw = self.client.get_paginated(f"{self.base_url}/users/{username}/repos")
        return [self._parse_repo(repo) for repo in raw]

    def get_repo(self, username: str, repo: str) -> dict:
        data = self.client.get(f"{self.base_url}/repos/{username}/{repo}")
        return self._parse_repo(data)