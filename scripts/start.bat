@echo off
cd /d "%~dp0.."
docker compose up --build -d
echo Pulling Ollama model (first run may take a few minutes)...
docker compose exec ollama ollama pull llama3.2
echo Started at http://localhost:8000
