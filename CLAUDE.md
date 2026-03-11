# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (run from `frontend/`)
```bash
npm run dev          # Dev server at http://localhost:3000
npm run build        # Next.js static export
npm run lint         # ESLint
npm run typecheck    # TypeScript check (tsc --noEmit)
npm test             # Jest unit/component tests (66 tests)
npm test -- --testPathPattern=<file>   # Run single test file
npm run test:e2e     # Playwright e2e tests (against dev server)
npm run test:e2e:ui  # Playwright with UI
```

### Backend (run from `backend/`)
```bash
.venv/Scripts/uvicorn main:app --reload   # Dev server at http://localhost:8000
.venv/Scripts/pytest -v                   # All tests (44 tests)
.venv/Scripts/pytest -v tests/test_kanban.py   # Single test file
.venv/Scripts/pytest -v -k "test_name"   # Single test by name
```
> `uv` is only available inside Docker — use `.venv/Scripts/` for local runs.

### Full Integration Pipeline
```bash
bash scripts/test.sh   # Fresh Docker build → Jest + pytest + Playwright e2e
```
Playwright against container: `BASE_URL=http://localhost:8000 npx playwright test`

## Architecture

### Request Flow
```
page.tsx (Server Component)
  → KanbanAppLoader (dynamic, ssr:false)   ← prevents hydration mismatch with nanoid
    → AppRoot (calls GET /api/auth/me)
      → LoginPage (if unauthenticated)
      → KanbanApp (if authenticated)
          → useBoard() hook → api.ts → FastAPI backend
          → Board + AI sidebar components
```

### Frontend State
`useBoard.ts` is the single source of truth for board state. Shape:
```typescript
{ columns: Column[]; cards: Record<string, Card> }
// Column: { id: string; name: string; cardIds: string[] }
// Card:   { id: string; title: string; details?: string }
```

**ID mapping**: Backend uses integer IDs; `api.ts` maps them to prefixed strings (`col-{n}`, `card-{n}`) to avoid dnd-kit collision between column and card IDs. This happens transparently in `src/lib/api.ts`.

### Backend
- FastAPI + SQLite. DB initialized via `init_db()` in `main.py` lifespan.
- Auth: HttpOnly cookie (`session`) with HS256 JWT, 24h expiry, hardcoded credentials (`user`/`password`).
- Routers: `routers/kanban.py` (board/column/card CRUD), `routers/ai.py` (chat endpoint).
- AI: `ai.py` uses Ollama (llama3.2) via OpenAI-compatible SDK. Returns `AIResponse` with message + structured `CardAction[]`.

### Key File Locations
| Concern | Path |
|---|---|
| API client + ID mapping | `frontend/src/lib/api.ts` |
| Board state hook | `frontend/src/hooks/useBoard.ts` |
| TypeScript types | `frontend/src/types/kanban.ts` |
| Colors (Tailwind v4 @theme) | `frontend/src/app/globals.css` |
| Backend CRUD routes | `backend/routers/kanban.py` |
| Auth logic | `backend/auth.py` |
| AI integration | `backend/ai.py` |
| DB schema + init | `backend/database.py` |
| Pydantic models | `backend/models.py` |
| pytest fixtures | `backend/tests/conftest.py` |
| nanoid Jest mock | `frontend/__mocks__/nanoid.js` |

## Testing Notes

- **nanoid** is ESM-only (v5); `__mocks__/nanoid.js` provides a CJS shim for Jest.
- **Backend test DB**: `conftest.py` auto-patches `DB_PATH` to a temp file per test — no shared state.
- **Playwright**: Workers=1 when `BASE_URL` is set (shared DB); unlimited workers locally with auto dev server start.
- **Docker gates**: Production image won't build if Jest or pytest fail (`COPY --from=frontend-test` + `.pytest-passed` marker).

## Tailwind v4

No `tailwind.config.ts`. Colors are defined in `globals.css` under `@theme { --color-* }`. Use those CSS variables (e.g., `bg-[var(--color-accent-yellow)]`) or the Tailwind utility names they generate.

## Coding Standards (from PROJECT.md)

- MVP: single user, single board — don't add multi-user/multi-board complexity.
- Prefer simplicity; avoid over-engineering and premature abstraction.
- No emojis in UI or code.
