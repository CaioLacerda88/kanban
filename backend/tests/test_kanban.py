import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Authenticated client with a fresh seeded board."""
    with TestClient(app) as c:
        c.post("/api/auth/login", json={"username": "user", "password": "password"})
        yield c


@pytest.fixture
def anon_client():
    """Unauthenticated client."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# GET /api/board
# ---------------------------------------------------------------------------

def test_get_board_requires_auth(anon_client):
    r = anon_client.get("/api/board")
    assert r.status_code == 401


def test_get_board_returns_seeded_board(client):
    r = client.get("/api/board")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Project Board"
    assert len(data["columns"]) == 5
    total = sum(len(col["cards"]) for col in data["columns"])
    assert total == 15


def test_get_board_column_order(client):
    cols = client.get("/api/board").json()["columns"]
    assert [c["name"] for c in cols] == ["Backlog", "To Do", "In Progress", "Review", "Done"]


def test_get_board_cards_sorted_by_position(client):
    cols = client.get("/api/board").json()["columns"]
    for col in cols:
        positions = [c["position"] for c in col["cards"]]
        assert positions == sorted(positions)


def test_get_board_idempotent(client):
    """Calling the board endpoint twice does not create duplicate data."""
    r1 = client.get("/api/board").json()
    r2 = client.get("/api/board").json()
    assert len(r1["columns"]) == len(r2["columns"])
    assert sum(len(c["cards"]) for c in r1["columns"]) == sum(len(c["cards"]) for c in r2["columns"])


# ---------------------------------------------------------------------------
# PUT /api/board/columns/{id}
# ---------------------------------------------------------------------------

def test_rename_column(client):
    col_id = client.get("/api/board").json()["columns"][0]["id"]
    r = client.put(f"/api/board/columns/{col_id}", json={"name": "Ideas"})
    assert r.status_code == 200
    assert r.json()["name"] == "Ideas"
    # Persisted
    updated = client.get("/api/board").json()["columns"][0]["name"]
    assert updated == "Ideas"


def test_rename_column_not_found(client):
    r = client.put("/api/board/columns/99999", json={"name": "X"})
    assert r.status_code == 404


def test_rename_column_requires_auth(anon_client):
    r = anon_client.put("/api/board/columns/1", json={"name": "X"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/board/cards
# ---------------------------------------------------------------------------

def test_create_card(client):
    col_id = client.get("/api/board").json()["columns"][0]["id"]
    r = client.post("/api/board/cards", json={"column_id": col_id, "title": "New task"})
    assert r.status_code == 201
    card = r.json()
    assert card["title"] == "New task"
    assert card["column_id"] == col_id


def test_create_card_with_details(client):
    col_id = client.get("/api/board").json()["columns"][0]["id"]
    r = client.post(
        "/api/board/cards",
        json={"column_id": col_id, "title": "Task", "details": "Some details"},
    )
    assert r.status_code == 201
    assert r.json()["details"] == "Some details"


def test_create_card_appended_at_end(client):
    col = client.get("/api/board").json()["columns"][0]
    col_id = col["id"]
    existing_count = len(col["cards"])
    r = client.post("/api/board/cards", json={"column_id": col_id, "title": "Last"})
    assert r.json()["position"] == existing_count


def test_create_card_invalid_column(client):
    r = client.post("/api/board/cards", json={"column_id": 99999, "title": "X"})
    assert r.status_code == 404


def test_create_card_requires_auth(anon_client):
    r = anon_client.post("/api/board/cards", json={"column_id": 1, "title": "X"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/board/cards/{id}
# ---------------------------------------------------------------------------

def test_update_card_title(client):
    card = client.get("/api/board").json()["columns"][0]["cards"][0]
    r = client.put(f"/api/board/cards/{card['id']}", json={"title": "Changed"})
    assert r.status_code == 200
    assert r.json()["title"] == "Changed"


def test_update_card_details(client):
    card = client.get("/api/board").json()["columns"][0]["cards"][0]
    r = client.put(f"/api/board/cards/{card['id']}", json={"details": "New details"})
    assert r.status_code == 200
    assert r.json()["details"] == "New details"


def test_update_card_not_found(client):
    r = client.put("/api/board/cards/99999", json={"title": "X"})
    assert r.status_code == 404


def test_update_card_requires_auth(anon_client):
    r = anon_client.put("/api/board/cards/1", json={"title": "X"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/board/cards/{id}
# ---------------------------------------------------------------------------

def test_delete_card(client):
    board = client.get("/api/board").json()
    col = board["columns"][0]
    card_id = col["cards"][0]["id"]
    r = client.delete(f"/api/board/cards/{card_id}")
    assert r.status_code == 200
    ids_after = [c["id"] for c in client.get("/api/board").json()["columns"][0]["cards"]]
    assert card_id not in ids_after


def test_delete_card_normalizes_positions(client):
    col = client.get("/api/board").json()["columns"][0]
    col_id = col["id"]
    first_card_id = col["cards"][0]["id"]
    client.delete(f"/api/board/cards/{first_card_id}")
    positions = [c["position"] for c in client.get("/api/board").json()["columns"][0]["cards"]]
    assert positions == list(range(len(positions)))


def test_delete_card_not_found(client):
    r = client.delete("/api/board/cards/99999")
    assert r.status_code == 404


def test_delete_card_requires_auth(anon_client):
    r = anon_client.delete("/api/board/cards/1")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# PUT /api/board/cards/{id}/move
# ---------------------------------------------------------------------------

def test_move_card_within_column(client):
    col = client.get("/api/board").json()["columns"][0]
    col_id = col["id"]
    card_id = col["cards"][0]["id"]
    r = client.put(f"/api/board/cards/{card_id}/move", json={"column_id": col_id, "position": 2})
    assert r.status_code == 200
    cards = client.get("/api/board").json()["columns"][0]["cards"]
    new_pos = next(c["position"] for c in cards if c["id"] == card_id)
    assert new_pos == 2


def test_move_card_to_different_column(client):
    board = client.get("/api/board").json()
    source = board["columns"][0]
    target = board["columns"][1]
    card_id = source["cards"][0]["id"]
    r = client.put(
        f"/api/board/cards/{card_id}/move",
        json={"column_id": target["id"], "position": 0},
    )
    assert r.status_code == 200
    board2 = client.get("/api/board").json()
    target_ids = [c["id"] for c in board2["columns"][1]["cards"]]
    source_ids = [c["id"] for c in board2["columns"][0]["cards"]]
    assert card_id in target_ids
    assert card_id not in source_ids


def test_move_card_source_column_reindexed(client):
    board = client.get("/api/board").json()
    source = board["columns"][0]
    target = board["columns"][4]
    card_id = source["cards"][0]["id"]
    client.put(
        f"/api/board/cards/{card_id}/move",
        json={"column_id": target["id"], "position": 0},
    )
    positions = [c["position"] for c in client.get("/api/board").json()["columns"][0]["cards"]]
    assert positions == list(range(len(positions)))


def test_move_card_invalid_card(client):
    board = client.get("/api/board").json()
    col_id = board["columns"][0]["id"]
    r = client.put("/api/board/cards/99999/move", json={"column_id": col_id, "position": 0})
    assert r.status_code == 404


def test_move_card_invalid_column(client):
    card_id = client.get("/api/board").json()["columns"][0]["cards"][0]["id"]
    r = client.put(f"/api/board/cards/{card_id}/move", json={"column_id": 99999, "position": 0})
    assert r.status_code == 404


def test_move_card_requires_auth(anon_client):
    r = anon_client.put("/api/board/cards/1/move", json={"column_id": 1, "position": 0})
    assert r.status_code == 401
