# Stage 1: build the Next.js frontend
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend with dev deps for testing
FROM python:3.13-slim AS backend-test

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY backend/pyproject.toml .
RUN uv sync --no-install-project

COPY backend/ .

# Stage 3: production — no dev deps
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY backend/pyproject.toml .
RUN uv sync --no-dev --no-install-project

COPY backend/ .
COPY --from=frontend /app/frontend/out ./static

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
