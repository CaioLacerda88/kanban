import sqlite3

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ai import CardAction, AIResponse, ask_ai, chat_ai
from auth import get_current_user
from database import get_db, get_user_board_id
from models import BoardModel, CardModel, ColumnModel

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


def _fetch_board(conn: sqlite3.Connection, username: str) -> BoardModel:
    board_id = get_user_board_id(conn, username)
    board = conn.execute("SELECT id, name FROM boards WHERE id = ?", (board_id,)).fetchone()
    cols = conn.execute(
        "SELECT id, board_id, name, position FROM columns WHERE board_id = ? ORDER BY position",
        (board_id,),
    ).fetchall()
    result_cols = []
    for col in cols:
        cards = conn.execute(
            "SELECT id, column_id, title, details, position FROM cards"
            " WHERE column_id = ? ORDER BY position",
            (col["id"],),
        ).fetchall()
        result_cols.append(
            ColumnModel(
                id=col["id"],
                board_id=col["board_id"],
                name=col["name"],
                position=col["position"],
                cards=[CardModel(**dict(c)) for c in cards],
            )
        )
    return BoardModel(id=board["id"], name=board["name"], columns=result_cols)


def _apply_action(conn: sqlite3.Connection, board_id: int, action: CardAction) -> None:
    if action.action == "create_card" and action.column_id and action.title:
        col = conn.execute(
            "SELECT id FROM columns WHERE id = ? AND board_id = ?",
            (action.column_id, board_id),
        ).fetchone()
        if col:
            max_pos = conn.execute(
                "SELECT COALESCE(MAX(position), -1) AS mp FROM cards WHERE column_id = ?",
                (action.column_id,),
            ).fetchone()["mp"]
            conn.execute(
                "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
                (action.column_id, action.title, action.details, max_pos + 1),
            )

    elif action.action == "update_card" and action.card_id:
        card = conn.execute(
            """SELECT c.id FROM cards c JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (action.card_id, board_id),
        ).fetchone()
        if card:
            if action.title is not None:
                conn.execute(
                    "UPDATE cards SET title = ? WHERE id = ?", (action.title, action.card_id)
                )
            if action.details is not None:
                conn.execute(
                    "UPDATE cards SET details = ? WHERE id = ?", (action.details, action.card_id)
                )

    elif action.action == "delete_card" and action.card_id:
        card = conn.execute(
            """SELECT c.id, c.column_id FROM cards c JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (action.card_id, board_id),
        ).fetchone()
        if card:
            col_id = card["column_id"]
            conn.execute("DELETE FROM cards WHERE id = ?", (action.card_id,))
            remaining = conn.execute(
                "SELECT id FROM cards WHERE column_id = ? ORDER BY position", (col_id,)
            ).fetchall()
            for i, row in enumerate(remaining):
                conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))

    elif action.action == "move_card" and action.card_id and action.column_id is not None:
        card = conn.execute(
            """SELECT c.id, c.column_id FROM cards c JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (action.card_id, board_id),
        ).fetchone()
        if not card:
            return
        target_col = conn.execute(
            "SELECT id FROM columns WHERE id = ? AND board_id = ?",
            (action.column_id, board_id),
        ).fetchone()
        if not target_col:
            return
        source_col_id = card["column_id"]
        target_cards = conn.execute(
            "SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position",
            (action.column_id, action.card_id),
        ).fetchall()
        target_ids = [r["id"] for r in target_cards]
        pos = action.position if action.position is not None else len(target_ids)
        pos = max(0, min(pos, len(target_ids)))
        target_ids.insert(pos, action.card_id)
        conn.execute(
            "UPDATE cards SET column_id = ? WHERE id = ?", (action.column_id, action.card_id)
        )
        for i, cid in enumerate(target_ids):
            conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, cid))
        if source_col_id != action.column_id:
            source_cards = conn.execute(
                "SELECT id FROM cards WHERE column_id = ? ORDER BY position", (source_col_id,)
            ).fetchall()
            for i, row in enumerate(source_cards):
                conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))


@router.post("/chat")
def chat(body: ChatRequest, username: str = Depends(get_current_user)):
    with get_db() as conn:
        board = _fetch_board(conn, username)

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
