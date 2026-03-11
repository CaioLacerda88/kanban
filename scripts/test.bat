@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo === Tearing down any existing container, resetting DB volume ===
docker compose down
if errorlevel 1 exit /b 1
REM Remove only the kanban data volume (fresh DB), preserve ollama-data
docker volume rm kanban_kanban-data 2>nul
REM (ignore error if volume doesn't exist)

echo === Building image (runs Jest + pytest inside Docker) ===
docker compose up --build -d
if errorlevel 1 exit /b 1

echo === Pulling Ollama model (skipped if already cached in volume) ===
docker compose exec ollama ollama pull llama3.2
if errorlevel 1 exit /b 1

echo === Warming up Ollama model (load into memory before e2e) ===
docker compose exec ollama ollama run llama3.2 "hi" 2>nul

echo === Waiting for container to be healthy ===
:wait
curl -sf http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    timeout /t 1 >nul
    goto :wait
)
echo Ready.

echo === Running e2e integration tests against http://localhost:8000 ===
cd frontend
set BASE_URL=http://localhost:8000
npx playwright test
if errorlevel 1 exit /b 1

echo.
echo === All tests passed ===
