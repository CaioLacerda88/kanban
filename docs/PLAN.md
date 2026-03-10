# High level steps for project

## Part 1: Plan - COMPLETE

- [x] Enrich this document with detailed substeps and success criteria for each part
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [x] User approves plan

---

## Part 2: Scaffolding

**Goal**: Docker container running FastAPI, serving a "Hello World" static HTML page and a working API endpoint.

- [ ] Create `backend/main.py` — FastAPI app with `GET /` (plain HTML for now) and `GET /api/health` returning `{"status": "ok"}`
- [ ] Create `backend/pyproject.toml` — uv project file with fastapi and uvicorn dependencies
- [ ] Create `Dockerfile` — multi-stage build:
  - Stage 1: Node 22 — runs `npm run build` in `frontend/`
  - Stage 2: Python 3.13 slim + uv — installs backend deps, copies frontend static output, runs uvicorn on port 8000
- [ ] Create `docker-compose.yml` — maps port 8000, mounts `.env` for secrets
- [ ] Create `scripts/start.sh` and `scripts/start.bat` — `docker compose up --build -d`
- [ ] Create `scripts/stop.sh` and `scripts/stop.bat` — `docker compose down`
- [ ] Create `.env.example` at project root with `OPENROUTER_API_KEY=`
- [ ] Add `.env` to root `.gitignore`

**Success criteria**:
- `scripts/start.sh` (or `start.bat`) builds and starts the container without errors
- `curl http://localhost:8000/api/health` returns `{"status": "ok"}`
- `http://localhost:8000/` shows a Hello World HTML page in the browser
- `scripts/stop.sh` (or `stop.bat`) stops the container cleanly

---

## Part 3: Add in Frontend

**Goal**: Next.js app statically built and served by FastAPI at `/`.

- [ ] Add `output: 'export'` to `frontend/next.config.ts` to enable static export
- [ ] Update `Dockerfile` to copy `frontend/out/` into the Python image as the static files directory
- [ ] Configure FastAPI to mount and serve the Next.js static files at `/`
- [ ] Handle SPA routing: any unmatched path serves `index.html`
- [ ] Verify `npm run build` produces `frontend/out/` without errors

**Success criteria**:
- `http://localhost:8000/` shows the full Kanban board
- Drag-and-drop works in the containerized app
- All 53 existing Jest unit tests still pass
- All 17 existing Playwright e2e tests still pass (updated to target port 8000)

---

## Part 4: Fake User Sign-In

**Goal**: Hardcoded login (`user` / `password`) gates access to the Kanban board.

- [ ] Add `POST /api/auth/login` — validates `{username, password}` against hardcoded values, returns a signed JWT in an HttpOnly cookie
- [ ] Add `POST /api/auth/logout` — clears the session cookie
- [ ] Add `GET /api/auth/me` — returns `{username}` from JWT cookie, or 401 if not authenticated
- [ ] Use PyJWT for token signing; secret key from environment variable
- [ ] Frontend: create `LoginPage` component (username + password fields, submit button, error message)
- [ ] Frontend: create `useAuth` hook — calls `/api/auth/me` on load to determine auth state
- [ ] Frontend: show `LoginPage` when unauthenticated, `KanbanApp` when authenticated
- [ ] Frontend: add logout button that calls `/api/auth/logout` and returns to login
- [ ] Backend tests (pytest): login success, login wrong password (401), `/api/auth/me` without cookie (401)
- [ ] Frontend tests (Jest): `LoginPage` renders correctly, form submits, error shown on bad credentials

**Success criteria**:
- `http://localhost:8000/` without a session shows the login page
- Logging in with `user` / `password` shows the Kanban board
- Wrong credentials show an error message (no redirect)
- Logging out returns to the login page
- JWT is stored in an HttpOnly cookie (not accessible from JS)

---

## Part 5: Database Modeling

**Goal**: Propose and get user sign-off on the SQLite schema before writing any backend data code.

- [ ] Design schema with tables: `users`, `boards`, `columns`, `cards`
- [ ] Save as `docs/schema.sql` (CREATE TABLE statements with constraints)
- [ ] Save as `docs/schema.json` (JSON representation of the same schema)
- [ ] Write `docs/DATABASE.md` documenting:
  - SQLite file at `/data/kanban.db` inside container, mounted as a Docker volume for persistence
  - Table relationships and key constraints
  - "Create if not exists" migration approach (no migration framework needed for MVP)
- [ ] Get user sign-off on schema before proceeding to Part 6

**Success criteria**:
- User approves `docs/schema.sql`, `docs/schema.json`, and `docs/DATABASE.md`
- Schema supports multiple users (future-proof) while enforcing 1 board per user for now

---

## Part 6: Backend API - COMPLETE

**Goal**: Full CRUD REST API for Kanban data, backed by SQLite, protected by JWT auth.

- [x] Create `backend/database.py` — SQLite connection helper, creates all tables on startup if they don't exist; seeds a default board for new users
- [x] Create `backend/models.py` — Pydantic models for Board, Column, Card (request and response shapes)
- [x] Create `backend/routers/kanban.py` with routes (all require valid JWT cookie):
  - `GET /api/board` — returns full board state for the authenticated user
  - `PUT /api/board/columns/{column_id}` — rename a column
  - `POST /api/board/cards` — create a card in a column
  - `PUT /api/board/cards/{card_id}` — update card title or details
  - `DELETE /api/board/cards/{card_id}` — delete a card
  - `PUT /api/board/cards/{card_id}/move` — move card to a different column and position
- [x] Backend unit tests (pytest + httpx): each route, both success and auth-failure (401) cases
- [x] Add a Docker volume in `docker-compose.yml` for `/data` to persist the SQLite file

**Success criteria**:
- All routes return correct data and HTTP status codes
- Unauthenticated requests to `/api/board/*` return 401
- `pytest` passes all backend tests
- Board data persists across container restarts (SQLite volume mounted)

---

## Part 7: Frontend + Backend Integration

**Goal**: Replace in-memory state with live API calls so the board is persistent.

- [ ] Create `frontend/src/lib/api.ts` — typed fetch wrapper for all backend endpoints
- [ ] Update `useBoard` hook:
  - Fetch initial board state from `GET /api/board` on mount
  - Call the appropriate API route on each mutation (add, update, delete card; rename column; move card)
  - Track loading state; surface errors to the UI
- [ ] Remove hard dependency on `src/data/seed.ts` in `KanbanApp.tsx` (seeding is now server-side)
- [ ] Add a loading spinner while the board fetches on initial load
- [ ] Update Jest tests: mock `lib/api.ts` instead of relying on seed data
- [ ] Update Playwright e2e tests to run against the full stack (requires backend running)

**Success criteria**:
- Board state persists across page refreshes
- All card and column operations update the database immediately
- Two browser tabs see consistent state after refresh
- Jest tests pass with the API mocked
- E2e tests pass against the running container

---

## Part 8: AI Connectivity

**Goal**: Backend can call Google Gemini and return a response.

- [ ] Load `GEMINI_API_KEY` from environment (via python-dotenv)
- [ ] Create `backend/ai.py` — OpenAI-compatible client targeting `https://generativelanguage.googleapis.com/openai/`, model `gemini-2.0-flash`
- [ ] Add `POST /api/ai/test` route — sends a hardcoded `"What is 2+2?"` prompt and returns the AI response
- [ ] Backend test: mock the Gemini HTTP call, verify the route parses and returns the response

**Success criteria**:
- `POST /api/ai/test` returns a response containing "4" (or equivalent)
- API key is read from the environment, never hardcoded
- Route works in the running Docker container with a real key in `.env`

---

## Part 9: AI with Structured Outputs

**Goal**: AI receives the full board context and can return board updates alongside its reply.

- [ ] Define Pydantic output schema in `backend/ai.py`:
  ```python
  class CardUpdate(BaseModel):
      action: Literal["create", "update", "delete", "move"]
      card_id: str | None
      column_id: str | None
      title: str | None
      details: str | None
      position: int | None

  class AIResponse(BaseModel):
      message: str
      updates: list[CardUpdate] | None
  ```
- [ ] Update `backend/ai.py` to accept: current board JSON + user message + conversation history; build a system prompt explaining the board schema and the AI's capabilities; use structured output (JSON mode / response_format) to get `AIResponse`
- [ ] Add `POST /api/ai/chat` route:
  - Accepts `{message: str, history: list[{role, content}]}`
  - Fetches the current board for the authenticated user
  - Calls the AI function
  - Applies any updates in `AIResponse.updates` to the database
  - Returns `{message: str, board_updated: bool}`
- [ ] Backend tests: structured output parsing, each action type applied correctly to the board

**Success criteria**:
- `POST /api/ai/chat` with `"Add a card called 'Deploy app' to the Done column"` creates the card in the database
- The response includes the AI's plain-language message
- `board_updated: true` when changes were made

---

## Part 10: AI Chat Sidebar

**Goal**: A polished sidebar in the UI for AI chat, with automatic board refresh when the AI makes changes.

- [ ] Create `frontend/src/components/AISidebar.tsx`:
  - Fixed toggle button on the right edge of the viewport
  - Slide-in panel with scrollable conversation history
  - Message input field and send button
  - Styled using the project color scheme (see PROJECT.md)
- [ ] Create `frontend/src/hooks/useAIChat.ts`:
  - Maintains conversation history in local state
  - Calls `POST /api/ai/chat` on send
  - If response includes `board_updated: true`, triggers a board data refresh
- [ ] Update `KanbanApp.tsx` to render `<AISidebar />` and pass a `refreshBoard` callback
- [ ] Update `useBoard` to expose a `refresh` function that re-fetches board state from the API
- [ ] Frontend tests (Jest): sidebar renders and toggles, message sends, board refreshes on `board_updated`
- [ ] E2e test (Playwright): open sidebar, type a message, verify AI response appears

**Success criteria**:
- Sidebar opens and closes with the toggle button
- User can type a message and receive a formatted AI response
- If the AI updates the board, the Kanban UI refreshes automatically (no page reload)
- Conversation history is scrollable and persists while the page is open
- UI matches the project color scheme: accent `#ecad0a`, blue `#209dd7`, purple `#753991`, navy `#032147`, gray `#888888`
