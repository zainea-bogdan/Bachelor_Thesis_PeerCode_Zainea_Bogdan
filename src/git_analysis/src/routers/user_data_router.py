from fastapi import APIRouter, HTTPException, Query
from typing import List
from src.services.UserService import UserService

router = APIRouter()
user_service = UserService()

@router.get("/user/{username}")
def get_user(username: str):
    try:
        return user_service.get_user(username)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))