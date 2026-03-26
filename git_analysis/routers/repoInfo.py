from fastapi import APIRouter,HTTPException
import requests

router = APIRouter()


#health check
@router.get("/test2")
def test():
    return {"message": "repo router works"}