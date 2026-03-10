# Database

SQLite, created automatically on first run if it does not exist.

## Location

Inside the container at `/data/kanban.db`, mounted as a Docker volume so data persists across container restarts.

## Tables

### users
One row per registered user. `username` is unique.

### boards
One board per user (`user_id` is UNIQUE). `name` defaults to `"Project Board"`.

### columns
Ordered by `position` (0-based integer). Deleting a board cascades to its columns.

### cards
Ordered by `position` within their column. Deleting a column cascades to its cards.

## Migrations

No migration framework. All tables use `CREATE TABLE IF NOT EXISTS`, so the schema is applied on startup and is safe to run against an existing database. Schema changes in future will be handled with `ALTER TABLE` statements added to the startup routine.

## Seeding

When a user logs in for the first time, the backend creates a board with the 5 default columns (Backlog, To Do, In Progress, Review, Done) and 15 sample cards.
