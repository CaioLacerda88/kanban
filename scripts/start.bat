@echo off
cd /d "%~dp0.."
docker compose up --build -d
echo Started at http://localhost:8000
