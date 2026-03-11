from pydantic import BaseModel, Field


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
    title: str = Field(min_length=1, max_length=255)
    details: str | None = None


class UpdateCardRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    details: str | None = None


class MoveCardRequest(BaseModel):
    column_id: int
    position: int


class RenameColumnRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
