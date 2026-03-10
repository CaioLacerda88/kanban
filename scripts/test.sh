#!/bin/sh
set -e
cd "$(dirname "$0")/.."

echo "=== Tearing down any existing container and volumes ==="
docker compose down -v

echo "=== Building image (runs Jest + pytest inside Docker) ==="
docker compose up --build -d

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
