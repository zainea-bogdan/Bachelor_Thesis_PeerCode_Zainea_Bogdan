from fastapi import APIRouter, HTTPException
import urllib.request
import requests

router = APIRouter()

@router.get("/info/{github_username}")
def get_user_info(github_username: str):
    #validation for username
    try:
        test_username = urllib.request.urlopen(f"https://github.com/{github_username}").getcode()
        if(test_username==200):
        #https://api.github.com/users/${github_username}
            try:
                response = requests.get(f"https://api.github.com/users/{github_username}")
                return {"User Info": response.json()}
            except:
                return {"error": "something went wrong fetching user data..."}
    except:
        return {"error": "Invalid link"}

@router.get("/info/{github_username}/repos")
def get_user_info(github_username: str):
    #validation for username
    try:
        test_username = urllib.request.urlopen(f"https://github.com/{github_username}").getcode()
        if(test_username==200):
        #https://api.github.com/users/${github_username}
            try:
                response = requests.get(f"https://api.github.com/users/{github_username}/repos")
                return {"Repo info": response.json()}
            except:
                return {"error": "something went wrong fetching user data..."}
    except:
        return {"error": "Invalid link"}

        

#health check
@router.get("/test1")
def test():
    return {"message": "user router works"}

