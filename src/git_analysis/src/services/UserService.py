from src.services.GithubClient import GitHubClient

class UserService:

    def __init__(self):
        self.client = GitHubClient()
        self.base_url = GitHubClient.BASE_URL

    def get_user(self, username: str) -> dict:
        data = self.client.get_simple_api_response(f"{self.base_url}/users/{username}")
        return {
            "username": data.get("login"),
            "profile_image": data.get("avatar_url"),
            "profile_url": data.get("html_url"),
            "visibility": data.get("user_view_type"),
            "location": data.get("location"),
            "bio": data.get("bio"),
            "followers": data.get("followers"),
            "following": data.get("following"),
            "github_user_since": data.get("created_at"),
            "public_repos": data.get("public_repos")
        }