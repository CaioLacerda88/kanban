# Code Review

> **Status**: All Critical, High, and Medium items resolved. Low items remain open.
> Resolved in commit after Part 10 — see individual items for implementation notes.

Reviewed against the codebase as of Part 10 (complete). Findings are grouped by severity. MVP-intentional limitations (hardcoded credentials, single user, local-only) are noted where they affect findings.

---

## Critical

### 1. AI JSON parsing has no error handling [RESOLVED]
**File:** `backend/ai.py` — `chat_ai()`

`json.loads(response.choices[0].message.content)` and `AIResponse(**data)` are called with no try/except. Local models (llama3.2) frequently emit malformed JSON or wrap it in markdown fences. If this fails, the `/api/ai/chat` endpoint returns a 500 with a raw traceback.

**Fix:** Wrap in try/except; on failure return a plain-text `AIResponse` with `board_updated=False` and the raw content as the message.

---

### 2. Move card endpoint is not atomic [RESOLVED — was already correct]
**File:** `backend/routers/kanban.py` — `move_card()`

The endpoint runs multiple UPDATE statements in sequence (update `column_id`, then re-sequence positions in source and target columns) without an explicit transaction. The `with get_db() as conn` block uses the sqlite3 connection's implicit transaction, which may auto-commit between statements depending on Python's sqlite3 isolation level.

**Fix:** Add `conn.execute("BEGIN")` explicitly, or verify that `isolation_level` on the connection is not `None` (autocommit). A simpler guard is `with conn:` inside the context manager, which sqlite3 treats as an explicit transaction.

---

### 3. Weak SECRET_KEY fallback [RESOLVED]
**File:** `backend/auth.py:7`

```python
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-replace-in-production-32b")
```

The fallback is in source control. If `.env` is absent the app starts silently with a known key, making all JWTs forgeable. Although this is a local Docker MVP, the container is often exposed on LAN.

**Fix:** Either raise at startup if `SECRET_KEY` is not set, or document that `.env` must be created from `.env.example` before `start.sh` (currently not mentioned in any script).

---

## High

### 4. Duplicated board-fetch [RESOLVED] logic
**Files:** `backend/routers/kanban.py:20-43` and `backend/routers/ai.py:33-56`

The SQL to fetch the full board (columns + cards) is copy-pasted verbatim into two routers. Any schema change or bug fix must be made in both places.

**Fix:** Extract to `backend/database.py` as `get_board(conn, board_id) -> BoardModel`.

### 5. Duplicated card-action [RESOLVED] logic
**Files:** `backend/routers/ai.py` — `_apply_action()` vs `backend/routers/kanban.py`

`_apply_action()` in `ai.py` reimplements create/update/delete/move with its own SQL, separate from the CRUD router. The two implementations can drift.

**Fix:** Refactor the CRUD router functions to be callable internally (extract pure functions that take a `conn` and body, then call them from both the HTTP handler and `_apply_action()`).

### 6. No error handling when Ollama [RESOLVED] is unreachable
**File:** `backend/routers/ai.py` — `chat()`

If Ollama is not running, the `openai` client raises a `ConnectError` that propagates as a 500. The Docker Compose `depends_on` only waits for the container to start, not for the model to be loaded.

**Fix:** Catch connection errors in `chat_ai()` and return a user-readable error message. Optionally add an Ollama health check to the `/api/health` endpoint.

### 7. Optimistic updates reload [RESOLVED] the entire board on failure
**File:** `frontend/src/hooks/useBoard.ts`

Every action catches errors with `.catch(loadBoard)`. A single failed rename or card move triggers a full board reload, causing a visible flash and discarding any other in-flight state.

**Fix:** Store the previous state before each optimistic update and restore it on failure instead of reloading:
```typescript
const prev = state;
setState(optimistic);
api.renameColumn(...).catch(() => setState(prev));
```

---

## Medium

### 8. No length validation on card title or column name
**Files:** `backend/models.py`, `backend/routers/kanban.py`

`title: str` and `name: str` have no length constraints. An empty string or a 100 000-character title is accepted and stored, breaking the UI layout.

**Fix:** Add `min_length=1, max_length=255` to the relevant Pydantic fields.

### 9. AppRoot renders blank while auth check is in-flight
**File:** `frontend/src/components/AppRoot.tsx:23`

```typescript
if (user === undefined) return null;
```

The user sees a completely blank screen until `GET /api/auth/me` resolves. On slow networks this looks like a broken app.

**Fix:** Return a minimal loading state (e.g. a centered spinner using the existing color scheme) while `user === undefined`.

### 10. AppRoot fetch leaks on unmount
**File:** `frontend/src/components/AppRoot.tsx`

The `fetch('/api/auth/me')` in `useEffect` has no cleanup. If the component unmounts before the request resolves, React logs a state-update-on-unmounted-component warning.

**Fix:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/auth/me', { signal: controller.signal })
    .then(...)
    .catch((e) => { if (e.name !== 'AbortError') setUser(null); });
  return () => controller.abort();
}, []);
```

### 11. CardModal delete is fire-and-forget
**File:** `frontend/src/components/CardModal.tsx`

The delete button calls `onDelete()` and `onClose()` synchronously. If the API call fails, the modal is already closed and the card disappears from the UI until `loadBoard()` runs and restores it. There is no error message.

**Fix:** Show an inline error in the modal if `deleteCard` fails, and only close on success.

### 12. useFocusTrap selector is incomplete
**File:** `frontend/src/hooks/useFocusTrap.ts`

The focusable selector omits `<a href>`, `<select>`, and `[contenteditable]`. Tab navigation in modals can skip valid interactive elements.

**Fix:** Use the standard comprehensive selector:
```
a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),
textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable]
```

### 13. N+1 query in board fetch
**File:** `backend/routers/kanban.py:23-42` (and duplicated in `ai.py`)

One SQL query fetches columns, then a second query per column fetches cards. With 5 columns this is 6 queries.

**Fix:** Use a single JOIN query:
```sql
SELECT c.*, card.* FROM columns c
LEFT JOIN cards card ON card.column_id = c.id
WHERE c.board_id = ?
ORDER BY c.position, card.position
```
Then assemble the nested structure in Python.

### 14. Frontend seed data is dead code
**File:** `frontend/src/data/seed.ts`

`createInitialState()` was used before Part 7 but is no longer called anywhere. It remains in the codebase, creating confusion about which dataset is authoritative.

**Fix:** Delete `frontend/src/data/seed.ts` and remove it from any imports.

### 15. `api.ts` error message leaks internal paths
**File:** `frontend/src/lib/api.ts`

```typescript
throw new Error(`API ${res.status}: ${url}`);
```

The URL is shown in error state in `KanbanApp.tsx`, potentially exposing internal route structure in the UI.

**Fix:** Throw with the status code only, or attempt to parse the response body for a `detail` field (FastAPI's default error format).

### 16. `pyproject.toml` still lists Gemini comment
**File:** `backend/pyproject.toml` (and `PROJECT.md`)

`PROJECT.md` still specifies `GEMINI_API_KEY` and `gemini-2.0-flash`, but the implementation switched to Ollama. `openai` is listed as a dependency with no explanation. `.env.example` may still reference `GEMINI_API_KEY`.

**Fix:** Update `PROJECT.md` and `.env.example` to reflect Ollama. Rename the dependency comment in `pyproject.toml`.

---

## Low

### 17. `_apply_action()` silently ignores invalid IDs
**File:** `backend/routers/ai.py`

Actions with non-existent card or column IDs are silently skipped. The AI receives no feedback that its action failed, so it may keep trying the same invalid action.

**Fix:** Collect failed actions and include them in the response message so the AI (or user) can see what didn't apply.

### 18. No column-name uniqueness validation
**File:** `backend/routers/kanban.py`

Two columns can have identical names. This is cosmetically confusing and could trip up AI actions that reference columns by name.

**Fix:** Optional — either enforce uniqueness at DB level or warn in the response.

### 19. `useAIChat` history grows without bound
**File:** `frontend/src/hooks/useAIChat.ts`

All chat messages are kept in state and sent as history on every request. A long conversation sends an ever-growing payload to the backend, eventually hitting Ollama's context limit.

**Fix:** Truncate history to the last N turns (e.g. 10) before sending, or implement a "clear chat" button.

### 20. Docker `start.sh` does not check if model pull succeeded
**File:** `scripts/start.sh`

```bash
docker compose exec ollama ollama pull llama3.2
```

If the pull fails (no internet, disk full), the script continues silently and the AI endpoints will fail at runtime.

**Fix:** Check exit code and print a clear error if the pull fails.

### 21. No `Content-Type` validation on POST endpoints
**File:** `backend/routers/kanban.py` and `backend/routers/ai.py`

FastAPI validates the body shape via Pydantic but does not require `Content-Type: application/json`. Requests with incorrect content types may produce confusing 422 errors.

**Note:** FastAPI handles this adequately by default; this is low priority.

### 22. `test_ai.py` does not test malformed JSON from model
**File:** `backend/tests/test_ai.py`

All AI tests mock the `chat_ai` function at the router level. No test covers what happens if `chat_ai()` itself receives malformed JSON from Ollama (ties back to Critical issue #1).

**Fix:** Add a test that patches `ai.client.chat.completions.create` to return non-JSON content and verifies the endpoint returns a 200 with a graceful error message rather than a 500.

---

## Summary

| Priority | Count | Key items |
|---|---|---|
| Critical | 3 | AI JSON parsing unguarded; move not atomic; weak SECRET_KEY fallback |
| High | 4 | Duplicated board-fetch + action logic; Ollama unreachable not handled; optimistic rollback |
| Medium | 9 | Missing validation; blank auth loading state; fetch leak; dead seed code; N+1 queries |
| Low | 5 | Silent action failures; unbounded history; model pull errors; dead PROJECT.md references |

### Recommended order of fixes

1. **AI JSON error handling** (#1) — most likely to cause visible failures in normal use
2. **Optimistic update rollback** (#7) — affects every user interaction
3. **Deduplicate board-fetch + action logic** (#4, #5) — reduces maintenance risk before any further work
4. **Input validation** (#8) — easy win, prevents data corruption
5. **Auth loading state** (#9) — quick UX improvement
6. **Move card transaction** (#2) — important for data integrity under concurrent use
7. **Dead seed file removal** (#14) — trivial cleanup
8. **Update PROJECT.md / .env.example** (#16) — documentation drift
