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


# --- Shared board/card operations used by both kanban and AI routers ---


def get_board(conn: sqlite3.Connection, username: str):
    """Fetch the full board for a user with a single JOIN query."""
    from models import BoardModel, CardModel, ColumnModel

    board_id = get_user_board_id(conn, username)
    board = conn.execute("SELECT id, name FROM boards WHERE id = ?", (board_id,)).fetchone()

    rows = conn.execute(
        """
        SELECT
            col.id        AS col_id,
            col.board_id  AS board_id,
            col.name      AS col_name,
            col.position  AS col_position,
            card.id       AS card_id,
            card.column_id,
            card.title,
            card.details,
            card.position AS card_position
        FROM columns col
        LEFT JOIN cards card ON card.column_id = col.id
        WHERE col.board_id = ?
        ORDER BY col.position, card.position
        """,
        (board_id,),
    ).fetchall()

    cols_map: dict = {}
    col_order: list[int] = []
    for row in rows:
        col_id = row["col_id"]
        if col_id not in cols_map:
            cols_map[col_id] = ColumnModel(
                id=col_id,
                board_id=row["board_id"],
                name=row["col_name"],
                position=row["col_position"],
                cards=[],
            )
            col_order.append(col_id)
        if row["card_id"] is not None:
            cols_map[col_id].cards.append(
                CardModel(
                    id=row["card_id"],
                    column_id=row["column_id"],
                    title=row["title"],
                    details=row["details"],
                    position=row["card_position"],
                )
            )

    return BoardModel(
        id=board["id"],
        name=board["name"],
        columns=[cols_map[cid] for cid in col_order],
    )


def db_create_card(
    conn: sqlite3.Connection, board_id: int, column_id: int, title: str, details: str | None
) -> sqlite3.Row | None:
    col = conn.execute(
        "SELECT id FROM columns WHERE id = ? AND board_id = ?", (column_id, board_id)
    ).fetchone()
    if col is None:
        return None
    max_pos = conn.execute(
        "SELECT COALESCE(MAX(position), -1) AS mp FROM cards WHERE column_id = ?",
        (column_id,),
    ).fetchone()["mp"]
    cur = conn.execute(
        "INSERT INTO cards (column_id, title, details, position) VALUES (?, ?, ?, ?)",
        (column_id, title, details, max_pos + 1),
    )
    return conn.execute("SELECT * FROM cards WHERE id = ?", (cur.lastrowid,)).fetchone()


def db_update_card(
    conn: sqlite3.Connection,
    board_id: int,
    card_id: int,
    title: str | None,
    details: str | None,
) -> sqlite3.Row | None:
    card = conn.execute(
        """SELECT c.id FROM cards c
           JOIN columns col ON c.column_id = col.id
           WHERE c.id = ? AND col.board_id = ?""",
        (card_id, board_id),
    ).fetchone()
    if card is None:
        return None
    if title is not None:
        conn.execute("UPDATE cards SET title = ? WHERE id = ?", (title, card_id))
    if details is not None:
        conn.execute("UPDATE cards SET details = ? WHERE id = ?", (details, card_id))
    return conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()


def db_delete_card(conn: sqlite3.Connection, board_id: int, card_id: int) -> bool:
    card = conn.execute(
        """SELECT c.id, c.column_id FROM cards c
           JOIN columns col ON c.column_id = col.id
           WHERE c.id = ? AND col.board_id = ?""",
        (card_id, board_id),
    ).fetchone()
    if card is None:
        return False
    col_id = card["column_id"]
    conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))
    remaining = conn.execute(
        "SELECT id FROM cards WHERE column_id = ? ORDER BY position", (col_id,)
    ).fetchall()
    for i, row in enumerate(remaining):
        conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))
    return True


def db_move_card(
    conn: sqlite3.Connection, board_id: int, card_id: int, column_id: int, position: int
) -> sqlite3.Row | None:
    card = conn.execute(
        """SELECT c.id, c.column_id FROM cards c
           JOIN columns col ON c.column_id = col.id
           WHERE c.id = ? AND col.board_id = ?""",
        (card_id, board_id),
    ).fetchone()
    if card is None:
        return None
    target_col = conn.execute(
        "SELECT id FROM columns WHERE id = ? AND board_id = ?", (column_id, board_id)
    ).fetchone()
    if target_col is None:
        return None

    source_col_id = card["column_id"]
    target_cards = conn.execute(
        "SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position",
        (column_id, card_id),
    ).fetchall()
    target_ids = [r["id"] for r in target_cards]
    pos = max(0, min(position, len(target_ids)))
    target_ids.insert(pos, card_id)

    conn.execute("UPDATE cards SET column_id = ? WHERE id = ?", (column_id, card_id))
    for i, cid in enumerate(target_ids):
        conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, cid))

    if source_col_id != column_id:
        source_cards = conn.execute(
            "SELECT id FROM cards WHERE column_id = ? ORDER BY position", (source_col_id,)
        ).fetchall()
        for i, row in enumerate(source_cards):
            conn.execute("UPDATE cards SET position = ? WHERE id = ?", (i, row["id"]))

    return conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,)).fetchone()
