@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo === Tearing down any existing container and volumes ===
docker compose down -v
if errorlevel 1 exit /b 1

echo === Building image (runs Jest + pytest inside Docker) ===
docker compose up --build -d
if errorlevel 1 exit /b 1

echo === Waiting for container to be healthy ===
:wait
curl -sf http://localhost:8000/api/health >/dev/null 2>&1
if errorlevel 1 (
    timeout /t 1 >/dev/null
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
