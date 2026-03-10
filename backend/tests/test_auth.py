import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_login_success(client):
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json() == {"username": "user"}
    assert "session" in response.cookies


def test_login_wrong_password(client):
    response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
    assert response.status_code == 401


def test_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_authenticated(client):
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}


def test_me_invalid_token(client):
    client.cookies.set("session", "invalid.token.here")
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(client):
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.cookies.get("session", "") == ""
