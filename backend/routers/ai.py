from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ai import AIResponse, CardAction, ask_ai, chat_ai
from auth import get_current_user
from database import (
    db_create_card,
    db_delete_card,
    db_move_card,
    db_update_card,
    get_board,
    get_db,
    get_user_board_id,
)

router = APIRouter(prefix="/api/ai")


@router.post("/test")
def test_ai(username: str = Depends(get_current_user)):
    answer = ask_ai("What is 2+2?")
    return {"answer": answer}


# --- Chat ---


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


def _apply_action(conn, board_id: int, action: CardAction) -> None:
    if action.action == "create_card" and action.column_id and action.title:
        db_create_card(conn, board_id, action.column_id, action.title, action.details)

    elif action.action == "update_card" and action.card_id:
        db_update_card(conn, board_id, action.card_id, action.title, action.details)

    elif action.action == "delete_card" and action.card_id:
        db_delete_card(conn, board_id, action.card_id)

    elif action.action == "move_card" and action.card_id and action.column_id is not None:
        pos = action.position if action.position is not None else 0
        db_move_card(conn, board_id, action.card_id, action.column_id, pos)


@router.post("/chat")
def chat(body: ChatRequest, username: str = Depends(get_current_user)):
    with get_db() as conn:
        board = get_board(conn, username)

    board_json = board.model_dump_json()
    history = [{"role": m.role, "content": m.content} for m in body.history]
    ai_response = chat_ai(board_json, body.message, history)

    board_updated = False
    if ai_response.actions:
        with get_db() as conn:
            board_id = get_user_board_id(conn, username)
            for action in ai_response.actions:
                _apply_action(conn, board_id, action)
        board_updated = True

    return {"message": ai_response.message, "board_updated": board_updated}
