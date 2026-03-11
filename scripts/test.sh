#!/bin/sh
set -e
cd "$(dirname "$0")/.."

echo "=== Tearing down any existing container, resetting DB volume ==="
docker compose down
# Remove only the kanban data volume (fresh DB), preserve ollama-data (avoid re-downloading model)
docker volume rm kanban_kanban-data 2>/dev/null || true

echo "=== Building image (runs Jest + pytest inside Docker) ==="
docker compose up --build -d

echo "=== Pulling Ollama model (skipped if already cached in volume) ==="
docker compose exec ollama ollama pull llama3.2

echo "=== Warming up Ollama model (load into memory before e2e) ==="
docker compose exec ollama ollama run llama3.2 "hi" 2>/dev/null || true

echo "=== Waiting for container to be healthy ==="
until curl -sf http://localhost:8000/api/health > /dev/null; do
  printf '.'
  sleep 1
done
echo " Ready."

echo "=== Running e2e integration tests against http://localhost:8000 ==="
cd frontend
BASE_URL=http://localhost:8000 npx playwright test

echo ""
echo "=== All tests passed ==="
