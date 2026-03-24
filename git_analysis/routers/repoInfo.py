from fastapi import APIRouter

router = APIRouter()


@router.get("/test2")
def test():
    return {"message": "repo router works"}