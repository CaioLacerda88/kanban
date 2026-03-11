from fastapi import APIRouter, Depends, HTTPException

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


@router.get("", response_model=BoardModel)
def get_board_route(username: str = Depends(get_current_user)):
    with get_db() as conn:
        return get_board(conn, username)


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
        row = db_create_card(conn, board_id, body.column_id, body.title, body.details)
        if row is None:
            raise HTTPException(status_code=404, detail="Column not found")
        return CardModel(**dict(row))


@router.put("/cards/{card_id}", response_model=CardModel)
def update_card(
    card_id: int,
    body: UpdateCardRequest,
    username: str = Depends(get_current_user),
):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        row = db_update_card(conn, board_id, card_id, body.title, body.details)
        if row is None:
            raise HTTPException(status_code=404, detail="Card not found")
        return CardModel(**dict(row))


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, username: str = Depends(get_current_user)):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        found = db_delete_card(conn, board_id, card_id)
        if not found:
            raise HTTPException(status_code=404, detail="Card not found")
    return {"ok": True}


@router.put("/cards/{card_id}/move", response_model=CardModel)
def move_card(
    card_id: int,
    body: MoveCardRequest,
    username: str = Depends(get_current_user),
):
    with get_db() as conn:
        board_id = get_user_board_id(conn, username)
        row = db_move_card(conn, board_id, card_id, body.column_id, body.position)
        if row is None:
            raise HTTPException(status_code=404, detail="Card or target column not found")
        return CardModel(**dict(row))
