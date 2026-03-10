import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from database import get_db, get_user_board_id
from models import (
    BoardModel,
    CardModel,
    ColumnModel,
    CreateCardRequest,
    MoveCardRequest,
    RenameColumnRequest,
    UpdateCardRequest,
)

router = APIRouter(prefix="/api/board")


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


@router.get("", response_model=BoardModel)
def get_board(username: str = Depends(get_current_user)):
    with get_db() as conn:
        return _fetch_board(conn, username)


@router.put("/columns/{column_id}", response_model=ColumnModel)
def rename_column(
    column_id: int,
    body: RenameColumnRequest,
    username: str = Depends(get_current_user),
):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        col = conn.execute(
            "SELECT id FROM columns WHERE id = ? AND board_id = ?",
            (column_id, board_id),
        ).fetchone()
        if col is None:
            raise HTTPException(status_code=404, detail="Column not found")
        conn.execute("UPDATE columns SET name = ? WHERE id = ?", (body.name, column_id))
        updated = conn.execute(
            "SELECT id, board_id, name, position FROM columns WHERE id = ?", (column_id,)
        ).fetchone()
    return ColumnModel(**dict(updated))


@router.post("/cards", response_model=CardModel, status_code=201)
def create_card(body: CreateCardRequest, username: str = Depends(get_current_user)):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        col = conn.execute(
            "SELECT id FROM columns WHERE id = ? AND board_id = ?",
            (body.column_id, board_id),
        ).fetchone()
        if col is None:
            raise HTTPException(status_code=404, detail="Column not found")
        max_pos = conn.execute(
            "SELECT COALESCE(MAX(position), -1) AS mp FROM cards WHERE column_id = ?",
            (body.column_id,),
        ).fetchone()["mp"]
        cur = conn.execute(
            "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
            (body.column_id, body.title, body.details, max_pos + 1),
        )
        card = conn.execute("SELECT * FROM cards WHERE id = ?", (cur.lastrowid,)).fetchone()
    return CardModel(**dict(card))


@router.put("/cards/{card_id}", response_model=CardModel)
def update_card(
    card_id: int,
    body: UpdateCardRequest,
    username: str = Depends(get_current_user),
):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        card = conn.execute(
            """SELECT c.id FROM cards c
               JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (card_id, board_id),
        ).fetchone()
        if card is None:
            raise HTTPException(status_code=404, detail="Card not found")
        if body.title is not None:
            conn.execute("UPDATE cards SET title = ? WHERE id = ?", (body.title, card_id))
        if body.details is not None:
            conn.execute("UPDATE cards SET details = ? WHERE id = ?", (body.details, card_id))
        updated = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
    return CardModel(**dict(updated))


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, username: str = Depends(get_current_user)):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        card = conn.execute(
            """SELECT c.id, c.column_id FROM cards c
               JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (card_id, board_id),
        ).fetchone()
        if card is None:
            raise HTTPException(status_code=404, detail="Card not found")
        col_id = card["column_id"]
        conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
        remaining = conn.execute(
            "SELECT id FROM cards WHERE column_id = ? ORDER BY position", (col_id,)
        ).fetchall()
        for i, row in enumerate(remaining):
            conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))
    return {"ok": True}


@router.put("/cards/{card_id}/move", response_model=CardModel)
def move_card(
    card_id: int,
    body: MoveCardRequest,
    username: str = Depends(get_current_user),
):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        card = conn.execute(
            """SELECT c.id, c.column_id FROM cards c
               JOIN columns col ON c.column_id = col.id
               WHERE c.id = ? AND col.board_id = ?""",
            (card_id, board_id),
        ).fetchone()
        if card is None:
            raise HTTPException(status_code=404, detail="Card not found")
        target_col = conn.execute(
            "SELECT id FROM columns WHERE id = ? AND board_id = ?",
            (body.column_id, board_id),
        ).fetchone()
        if target_col is None:
            raise HTTPException(status_code=404, detail="Target column not found")

        source_col_id = card["column_id"]

        # Build new ordering for target column
        target_cards = conn.execute(
            "SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position",
            (body.column_id, card_id),
        ).fetchall()
        target_ids = [r["id"] for r in target_cards]
        pos = max(0, min(body.position, len(target_ids)))
        target_ids.insert(pos, card_id)

        conn.execute("UPDATE cards SET column_id = ? WHERE id = ?", (body.column_id, card_id))
        for i, cid in enumerate(target_ids):
            conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, cid))

        # Normalize source column if card moved columns
        if source_col_id != body.column_id:
            source_cards = conn.execute(
                "SELECT id FROM cards WHERE column_id = ? ORDER BY position",
                (source_col_id,),
            ).fetchall()
            for i, row in enumerate(source_cards):
                conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))

        updated = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
    return CardModel(**dict(updated))
