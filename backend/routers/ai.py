from fastapi import APIRouter, Depends

from ai import ask_ai
from auth import get_current_user

router = APIRouter(prefix="/api/ai")


@router.post("/test")
def test_ai(username: str = Depends(get_current_user)):
    answer = ask_ai("What is 2+2?")
    return {"answer": answer}
