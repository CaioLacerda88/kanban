from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

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
    assert call_kwargs["model"] == "gemini-2.0-flash"
    assert any("2+2" in m["content"] for m in call_kwargs["messages"])
