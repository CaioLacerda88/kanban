# Stage 1: build the Next.js frontend
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: run frontend unit tests (gates the production build)
FROM frontend AS frontend-test
RUN npm test -- --watchAll=false --ci

# Stage 3: backend with dev deps for testing
FROM python:3.13-slim AS backend-test

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY backend/pyproject.toml .
RUN uv sync --no-install-project

COPY backend/ .

RUN uv run pytest -v && touch .pytest-passed

# Stage 4: production — only reached if both test stages passed
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY backend/pyproject.toml .
RUN uv sync --no-dev --no-install-project

COPY backend/ .
COPY --from=frontend-test /app/frontend/out ./static
COPY --from=backend-test /app/.pytest-passed /app/.pytest-passed

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
