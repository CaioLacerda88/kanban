from pydantic import BaseModel


class CardModel(BaseModel):
    id: int
    column_id: int
    title: str
    details: str | None
    position: int


class ColumnModel(BaseModel):
    id: int
    board_id: int
    name: str
    position: int
    cards: list[CardModel] = []


class BoardModel(BaseModel):
    id: int
    name: str
    columns: list[ColumnModel]


class CreateCardRequest(BaseModel):
    column_id: int
    title: str
    details: str | None = None


class UpdateCardRequest(BaseModel):
    title: str | None = None
    details: str | None = None


class MoveCardRequest(BaseModel):
    column_id: int
    position: int


class RenameColumnRequest(BaseModel):
    name: str
