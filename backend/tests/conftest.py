import pytest


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Give every test its own throwaway SQLite database and required env vars."""
    monkeypatch.setenv("DB_PATH", str(tmp_path / "kanban.db"))
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-testing")
