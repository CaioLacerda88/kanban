import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, HTTPException

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-replace-in-production-32b")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Hardcoded for MVP
CREDENTIALS = {"user": "password"}


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(session: str | None = Cookie(default=None)) -> str:
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(session)
