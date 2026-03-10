from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from auth import CREDENTIALS, create_token, get_current_user
from database import init_db
from routers.kanban import router as kanban_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(kanban_router)

STATIC_DIR = Path(__file__).parent / "static"


# --- Auth routes ---

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(body: LoginRequest, response: Response):
    if CREDENTIALS.get(body.username) != body.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(body.username)
    response.set_cookie("session", token, httponly=True, samesite="lax")
    return {"username": body.username}


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


@app.get("/api/auth/me")
def me(username: str = Depends(get_current_user)):
    return {"username": username}


# --- Health ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Static files (must be last) ---

if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
