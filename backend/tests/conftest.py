import pytest


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Give every test its own throwaway SQLite database."""
    monkeypatch.setenv("DB_PATH", str(tmp_path / "kanban.db"))
