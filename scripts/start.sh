#!/bin/sh
set -e
cd "$(dirname "$0")/.."
docker compose up --build -d
echo "Started at http://localhost:8000"
