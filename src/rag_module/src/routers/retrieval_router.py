from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.services.rag_services.RetrievalService import RetrievalService

router = APIRouter()
retrieval_service = RetrievalService()


class GenerateRequest(BaseModel):
    course_id: str
    course_name: str
    teacher_id: str
    context: str
    domain: str = ""
    projects_count: int
    difficulty_per_slot: list[str]
    start_date: str
    deadline: str


@router.post("/generate")
def generate_blueprints(request: GenerateRequest):

    # validation 1 — context minimum length
    if len(request.context.strip()) < 50:
        raise HTTPException(
            status_code=400,
            detail="context must be at least 50 characters"
        )

    # validation 2 — difficulty count matches projects count
    if len(request.difficulty_per_slot) != request.projects_count:
        raise HTTPException(
            status_code=400,
            detail="difficulty_per_slot length must match projects_count"
        )

    # validation 3 — unique difficulty values
    if len(set(request.difficulty_per_slot)) != len(request.difficulty_per_slot):
        raise HTTPException(
            status_code=400,
            detail="each project must have a unique difficulty level"
        )

    # validation 4 — valid difficulty values
    valid_difficulties = {"easy", "medium", "hard"}
    for difficulty in request.difficulty_per_slot:
        if difficulty not in valid_difficulties:
            raise HTTPException(
                status_code=400,
                detail=f"invalid difficulty: {difficulty}. Must be easy, medium or hard"
            )

    try:
        result = retrieval_service.generate_blueprints(
            course_id=request.course_id,
            course_name=request.course_name,
            teacher_id=request.teacher_id,
            context=request.context,
            domain=request.domain,
            projects_count=request.projects_count,
            difficulty_per_slot=request.difficulty_per_slot,
            start_date=request.start_date,
            deadline=request.deadline
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))