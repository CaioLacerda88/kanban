from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from ai import AIResponse, CardAction, OLLAMA_MODEL
from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        c.post("/api/auth/login", json={"username": "user", "password": "password"})
        yield c


def test_ai_test_requires_auth():
    with TestClient(app) as c:
        r = c.post("/api/ai/test")
    assert r.status_code == 401


def test_ai_test_returns_answer(client):
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "The answer is 4."

    with patch("ai.client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_completion
        r = client.post("/api/ai/test")

    assert r.status_code == 200
    assert "4" in r.json()["answer"]


def test_ai_test_passes_correct_model_and_prompt(client):
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "4"

    with patch("ai.client") as mock_client:
        mock_client.chat.completions.create.return_value = mock_completion
        client.post("/api/ai/test")

    call_kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == OLLAMA_MODEL
    assert any("2+2" in m["content"] for m in call_kwargs["messages"])


# --- Chat tests ---


def test_chat_requires_auth():
    with TestClient(app) as c:
        r = c.post("/api/ai/chat", json={"message": "hello"})
    assert r.status_code == 401


def test_chat_returns_message_no_actions(client):
    mock_response = AIResponse(message="Hello! How can I help?", actions=[])

    with patch("routers.ai.chat_ai", return_value=mock_response):
        r = client.post("/api/ai/chat", json={"message": "hello"})

    assert r.status_code == 200
    assert r.json()["message"] == "Hello! How can I help?"
    assert r.json()["board_updated"] is False


def test_chat_creates_card(client):
    # Done column is column_id=5 in a freshly seeded board
    mock_response = AIResponse(
        message="I've added 'Deploy app' to the Done column.",
        actions=[CardAction(action="create_card", column_id=5, title="Deploy app")],
    )

    with patch("routers.ai.chat_ai", return_value=mock_response):
        r = client.post(
            "/api/ai/chat",
            json={"message": "Add a card called 'Deploy app' to the Done column"},
        )

    assert r.status_code == 200
    assert r.json()["board_updated"] is True

    # Verify the card exists in the board
    board_r = client.get("/api/board")
    done_col = next(c for c in board_r.json()["columns"] if c["name"] == "Done")
    titles = [card["title"] for card in done_col["cards"]]
    assert "Deploy app" in titles


def test_chat_passes_board_json_and_message(client):
    mock_response = AIResponse(message="ok", actions=[])

    with patch("routers.ai.chat_ai", return_value=mock_response) as mock_fn:
        client.post("/api/ai/chat", json={"message": "What cards are in Backlog?"})

    mock_fn.assert_called_once()
    board_json_arg, message_arg, history_arg = mock_fn.call_args.args
    assert "columns" in board_json_arg
    assert "Backlog" in board_json_arg
    assert message_arg == "What cards are in Backlog?"
    assert history_arg == []


def test_chat_passes_history(client):
    mock_response = AIResponse(message="ok", actions=[])
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]

    with patch("routers.ai.chat_ai", return_value=mock_response) as mock_fn:
        client.post("/api/ai/chat", json={"message": "follow up", "history": history})

    _, _, history_arg = mock_fn.call_args.args
    assert history_arg == history
