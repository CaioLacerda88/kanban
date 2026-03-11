import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, HTTPException

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Hardcoded for MVP
CREDENTIALS = {"user": "password"}


def _secret_key() -> str:
    """Read SECRET_KEY at call time so tests can patch the env var after import."""
    return os.getenv("SECRET_KEY", "")


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, _secret_key(), algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(session: str | None = Cookie(default=None)) -> str:
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(session)
