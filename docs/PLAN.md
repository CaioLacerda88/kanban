# High level steps for project

## Part 1: Plan - COMPLETE

- [x] Enrich this document with detailed substeps and success criteria for each part
- [x] Create `frontend/AGENTS.md` describing the existing frontend code
- [x] User approves plan

---

## Part 2: Scaffolding - COMPLETE

**Goal**: Docker container running FastAPI, serving a static HTML page and a working API endpoint.

- [x] Create `backend/main.py` — FastAPI app with `GET /api/health` returning `{"status": "ok"}`
- [x] Create `backend/pyproject.toml` — uv project file with fastapi and uvicorn dependencies
- [x] Create `Dockerfile` — multi-stage build (Node 22 frontend build + Python 3.13 slim backend)
- [x] Create `docker-compose.yml` — maps port 8000, mounts `.env` for secrets, named volume for `/data`
- [x] Create `scripts/start.sh` and `scripts/start.bat` — `docker compose up --build -d`
- [x] Create `scripts/stop.sh` and `scripts/stop.bat` — `docker compose down`
- [x] Create `.env.example` with `GEMINI_API_KEY=` and `SECRET_KEY=`
- [x] Add `.env` to root `.gitignore`

> **Design note**: `uv` is only installed inside Docker. Local backend dev uses a `.venv` created with `python -m venv`. Backend tests run locally via `backend/.venv/Scripts/pytest`.

---

## Part 3: Add in Frontend - COMPLETE

**Goal**: Next.js app statically built and served by FastAPI at `/`.

- [x] Add `output: 'export'` to `frontend/next.config.ts` to enable static export
- [x] Update `Dockerfile` to copy `frontend/out/` into the Python image as the static files directory
- [x] Configure FastAPI to mount and serve the Next.js static files at `/`

---

## Part 4: Fake User Sign-In - COMPLETE

**Goal**: Hardcoded login (`user` / `password`) gates access to the Kanban board.

- [x] `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — JWT in an HttpOnly cookie
- [x] Frontend `LoginPage` component and `useAuth` hook
- [x] Backend pytest tests; frontend Jest tests

---

## Part 5: Database Modeling - COMPLETE

**Goal**: SQLite schema approved and documented.

- [x] Tables: `users`, `boards`, `columns`, `cards` (see `docs/schema.sql`, `docs/DATABASE.md`)
- [x] SQLite file at `/data/kanban.db` inside container, mounted as a Docker volume

---

## Part 6: Backend API - COMPLETE

**Goal**: Full CRUD REST API for Kanban data, backed by SQLite, protected by JWT auth.

- [x] `backend/database.py` — `get_db()` context manager, `init_db()`, `get_user_board_id()` (creates+seeds on first call)
- [x] `backend/models.py` — Pydantic models for Board, Column, Card
- [x] `backend/routers/kanban.py` — 6 routes, all require valid JWT cookie
- [x] Backend pytest tests (36 total): each route, success + auth-failure cases
- [x] Docker volume in `docker-compose.yml` for `/data`

> **Design note**: `_db_path()` reads the `DB_PATH` env var at call time (not import time) so `monkeypatch.setenv` works in tests. `conftest.py` uses an `autouse=True` fixture that points `DB_PATH` to a `tmp_path` file, giving each test an isolated SQLite DB.

---

## Part 7: Frontend + Backend Integration - COMPLETE

**Goal**: Replace in-memory state with live API calls so the board is persistent.

- [x] `frontend/src/lib/api.ts` — typed fetch wrapper; IDs prefixed `card-N` / `col-N` to avoid dnd-kit namespace collision with backend integer IDs
- [x] `useBoard` hook rewritten: fetches from API on mount, optimistic updates with `.catch(loadBoard)` fallback; `addCard` waits for API response to get real ID
- [x] `KanbanApp.tsx` shows loading/error states
- [x] Jest tests updated: global `fetch` mock, `ApiBoard` fixture, async `waitFor` pattern
- [x] Playwright e2e tests rewritten as true integration tests (no mocks)

> **Design note (ID prefixing)**: Backend uses integer IDs 1–5 for both cards and columns. dnd-kit's `resolveDrop` disambiguates by checking `state.cards[overId]` — without prefixing, card IDs collide with column IDs and cross-column drops land in the wrong place. `boardFromApi()` prefixes all IDs; API methods strip prefixes before HTTP calls.

---

## Part 7b: Integration Test Pipeline - COMPLETE

**Goal**: All tests run inside Docker; e2e tests hit the real containerised backend with no mocks.

- [x] **Dockerfile**: `frontend-test` stage runs `npm test -- --watchAll=false --ci`; `backend-test` stage runs `uv run pytest -v && touch .pytest-passed`; production stage uses `COPY --from=frontend-test` and `COPY --from=backend-test .pytest-passed` so the build fails if either test stage fails
- [x] **`scripts/test.sh` / `scripts/test.bat`**: `docker compose down -v` (fresh DB) → `docker compose up --build -d` (unit tests run during build) → wait for `/api/health` → `BASE_URL=http://localhost:8000 npx playwright test`
- [x] **`playwright.config.ts`**: `BASE_URL` env var support; `workers: 1` + serial mode when pointing at a container (tests share a real SQLite DB)
- [x] **e2e tests** (`auth`, `board`, `cards`, `columns`, `dnd`): no mocks; login via real `/api/auth/login`; every mutation verified with `page.waitForResponse()` checking HTTP status + response body; column rename tests restore original names after mutation to maintain DB state for subsequent tests

**Verified**: `bash scripts/test.sh` → 69 Jest + 36 pytest (inside Docker build) + 22 Playwright e2e (against container)

---

## Part 8: AI Connectivity

**Goal**: Backend can call Google Gemini and return a response.

- [ ] Add `openai>=1.0` to `backend/pyproject.toml` (OpenAI-compatible client pointing at Gemini)
- [ ] Create `backend/ai.py`: `OpenAI` client with `base_url="https://generativelanguage.googleapis.com/openai/v1"` and `api_key=os.getenv("GEMINI_API_KEY")`; `ask_ai(prompt: str) -> str`
- [ ] Create `backend/routers/ai.py` with `POST /api/ai/test` (auth required): calls `ask_ai("What is 2+2?")` and returns `{"answer": ...}`
- [ ] Register the AI router in `backend/main.py`
- [ ] `backend/tests/test_ai.py`: mock `ai.client` with `unittest.mock.patch`; verify 401 without auth, response shape, correct model + prompt passed to the client

**Success criteria**:
- `POST /api/ai/test` (authenticated) returns `{"answer": "..."}` containing "4"
- API key read from `GEMINI_API_KEY` env var, never hardcoded
- Route works in the running Docker container with the real key in `.env`
- All 3 new pytest tests pass; existing 36 still pass

---

## Part 9: AI with Structured Outputs

**Goal**: AI receives the full board context and can return board updates alongside its reply.

- [ ] Define Pydantic output schema in `backend/ai.py` (`CardUpdate`, `AIResponse`)
- [ ] Update `backend/ai.py` to accept board JSON + user message + conversation history; use JSON mode to get `AIResponse`
- [ ] Add `POST /api/ai/chat` route (auth required): fetch board, call AI, apply updates, return `{message, board_updated}`
- [ ] Backend tests: structured output parsing, each action type applied correctly

**Success criteria**:
- `POST /api/ai/chat` with `"Add a card called 'Deploy app' to the Done column"` creates the card in the database
- Response includes `message` and `board_updated: true`

---

## Part 10: AI Chat Sidebar

**Goal**: A polished sidebar in the UI for AI chat, with automatic board refresh when the AI makes changes.

- [ ] Create `frontend/src/components/AISidebar.tsx`: fixed toggle, slide-in panel, scrollable history, message input, project color scheme
- [ ] Create `frontend/src/hooks/useAIChat.ts`: conversation history, calls `POST /api/ai/chat`, triggers board refresh on `board_updated: true`
- [ ] Expose `refresh` from `useBoard`; pass `refreshBoard` callback into `AISidebar`
- [ ] Frontend Jest tests: sidebar renders and toggles, message sends, board refreshes on `board_updated`
- [ ] E2e test: open sidebar, type a message, verify AI response appears

**Success criteria**:
- Sidebar opens/closes with toggle button
- User can type and receive a formatted AI response
- Board refreshes automatically if AI makes changes (no page reload)
- UI matches project color scheme: accent `#ecad0a`, blue `#209dd7`, purple `#753991`, navy `#032147`, gray `#888888`
