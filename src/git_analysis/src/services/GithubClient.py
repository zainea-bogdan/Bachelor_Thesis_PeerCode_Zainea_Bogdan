import os
from fastapi import HTTPException
import requests
from dotenv import load_dotenv

#imi incarc prima data token ul din env
load_dotenv()

class GitHubClient:
    BASE_URL = "https://api.github.com"

    def __init__(self):
        self.headers = {
            "Authorization": f"token {os.getenv('GITHUB_API_PAT')}"
        }

    def get_simple_api_response(self, url: str, params: dict = None) -> dict:
        response = requests.get(self.BASE_URL+url, headers=self.headers, params=params or {})
        if response.status_code != 200:
            raise Exception(f"GitHub API error {response.status_code}: {response.text}")
        return response.json()

    def get_paginated_api_response(self, url: str, params: dict = None) -> list:
        page = 1
        all_data = []
        while True:
            data = self.get_simple_api_response(self.BASE_URL+url, 
                            params={"per_page": 100, "page": page})
            if not data:
                break
            all_data.extend(data)
            page += 1
        return all_data