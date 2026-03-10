import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def _db_path() -> str:
    return os.getenv("DB_PATH", "/data/kanban.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT    NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS boards (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                name    TEXT    NOT NULL DEFAULT 'Project Board'
            );
            CREATE TABLE IF NOT EXISTS columns (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                name     TEXT    NOT NULL,
                position INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cards (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
                title     TEXT    NOT NULL,
                details   TEXT,
                position  INTEGER NOT NULL
            );
        """)


_DEFAULT_COLUMNS = ["Backlog", "To Do", "In Progress", "Review", "Done"]

_SEED_CARDS = [
    ("Backlog",      "Set up CI/CD pipeline",            "Configure GitHub Actions for automated testing and deployment"),
    ("Backlog",      "Write API documentation",           "Document all REST endpoints using OpenAPI/Swagger"),
    ("Backlog",      "Add dark mode support",             "Implement dark/light theme toggle using CSS variables"),
    ("To Do",        "Design onboarding flow",            "Create wireframes for user onboarding experience"),
    ("To Do",        "Implement search feature",          "Add full-text search across cards and columns"),
    ("To Do",        "Add keyboard shortcuts",            "Enable power users to navigate the board without a mouse"),
    ("In Progress",  "Refactor authentication module",    "Migrate from session tokens to JWT for stateless auth"),
    ("In Progress",  "Optimize database queries",         "Add indexes and rewrite slow queries identified in profiling"),
    ("In Progress",  "Build notification system",         "Real-time notifications for card assignments and comments"),
    ("Review",       "Code review: payment integration",  "Review PR #42 adding Stripe subscription management"),
    ("Review",       "Test mobile responsiveness",        "Verify all board interactions work on iOS and Android"),
    ("Review",       "Security audit",                    "Review auth flows and input validation for vulnerabilities"),
    ("Done",         "Set up project repository",         "Initialize monorepo with frontend and backend structure"),
    ("Done",         "Create initial database schema",    "Design and document the SQLite schema for the Kanban app"),
    ("Done",         "Deploy staging environment",        "Set up Docker-based staging on cloud provider"),
]


def _seed_board(conn: sqlite3.Connection, user_id: int) -> None:
    cur = conn.execute(
        "INSERT INTO boards (user_id, name) VALUES (?, 'Project Board')", (user_id,)
    )
    board_id = cur.lastrowid

    col_ids: dict[str, int] = {}
    for pos, name in enumerate(_DEFAULT_COLUMNS):
        c = conn.execute(
            "INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)",
            (board_id, name, pos),
        )
        col_ids[name] = c.lastrowid

    col_positions: dict[str, int] = {name: 0 for name in _DEFAULT_COLUMNS}
    for col_name, title, details in _SEED_CARDS:
        pos = col_positions[col_name]
        conn.execute(
            "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
            (col_ids[col_name], title, details, pos),
        )
        col_positions[col_name] += 1


def get_user_board_id(conn: sqlite3.Connection, username: str) -> int:
    """Return the board_id for the user, creating user + seeded board if first login."""
    user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if user is None:
        cur = conn.execute("INSERT INTO users (username) VALUES (?)", (username,))
        user_id = cur.lastrowid
        _seed_board(conn, user_id)
    else:
        user_id = user["id"]

    board = conn.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,)).fetchone()
    if board is None:
        _seed_board(conn, user_id)
        board = conn.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,)).fetchone()

    return board["id"]
