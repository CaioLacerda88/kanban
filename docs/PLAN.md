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

## Part 8: AI Connectivity - COMPLETE

**Goal**: Backend can call an LLM and return a response.

- [x] Add `openai>=1.0` to `backend/pyproject.toml` (OpenAI-compatible client)
- [x] Create `backend/ai.py`: `OpenAI` client with configurable `OLLAMA_BASE_URL` + `OLLAMA_MODEL`; `ask_ai(prompt: str) -> str`
- [x] Create `backend/routers/ai.py` with `POST /api/ai/test` (auth required): calls `ask_ai("What is 2+2?")` and returns `{"answer": ...}`
- [x] Register the AI router in `backend/main.py`
- [x] `backend/tests/test_ai.py`: mock `ai.client` with `unittest.mock.patch`; verify 401 without auth, response shape, correct model + prompt passed to the client

> **Design note**: Switched from Gemini (free tier quota-limited) to **Ollama** (local, free). `OLLAMA_BASE_URL` defaults to `http://localhost:11434/v1`; in Docker Compose the app service gets `http://ollama:11434/v1` via `environment`. `OLLAMA_MODEL` defaults to `llama3.2`. `docker-compose.yml` adds an `ollama` service with a named volume so models persist across restarts. `scripts/start.sh` / `start.bat` run `docker compose exec ollama ollama pull llama3.2` after startup.

---

## Part 9: AI with Structured Outputs - COMPLETE

**Goal**: AI receives the full board context and can return board updates alongside its reply.

- [x] `CardAction` + `AIResponse` Pydantic schemas in `backend/ai.py`
- [x] `chat_ai(board_json, message, history)` in `backend/ai.py`: sends system prompt with board JSON + history, uses `response_format={"type": "json_object"}` for structured output
- [x] `POST /api/ai/chat` in `backend/routers/ai.py` (auth required): fetches board, calls AI, applies actions (`create_card`, `update_card`, `delete_card`, `move_card`), returns `{message, board_updated}`
- [x] 5 new pytest tests: auth, message passthrough, card creation verified in DB, board_json/message args, history passing — 44 total pass

> **Design note**: `CardAction` uses a plain `str` discriminator field rather than a `Literal` union, keeping the JSON schema simple for the model. Action application in `_apply_action()` in `routers/ai.py` silently ignores invalid card/column IDs (graceful degradation).

---

## Part 10: AI Chat Sidebar - COMPLETE

**Goal**: A polished sidebar in the UI for AI chat, with automatic board refresh when the AI makes changes.

- [x] `frontend/src/components/AISidebar.tsx`: fixed `✦` toggle button (bottom-right), slide-in `<aside>` panel, scrollable chat history with auto-scroll, message textarea + Send button, project color scheme
- [x] `frontend/src/hooks/useAIChat.ts`: manages `ChatMessage[]` state, captures history before each send, calls `POST /api/ai/chat`, calls `refreshBoard()` on `board_updated: true`
- [x] Exposed `refresh: loadBoard` from `useBoard` (added to `UseBoardReturn` interface)
- [x] `KanbanApp.tsx` renders `<AISidebar refreshBoard={refresh} />` alongside `<Board />`
- [x] Jest tests: 7 for `AISidebar` + 6 for `useAIChat` — 82 total pass
- [x] `frontend/e2e/ai.spec.ts`: toggle open/close, send message → verify `POST /api/ai/chat` returns 200, AI reply visible in sidebar
- [x] `scripts/test.sh` / `scripts/test.bat`: preserve `ollama-data` volume across runs, pull model after startup

> **Design note**: `scrollIntoView` not in jsdom — mocked with `Element.prototype.scrollIntoView = jest.fn()` in `beforeAll`. `useAIChat` captures `messages` before `setMessages` so the correct history is sent per turn.
