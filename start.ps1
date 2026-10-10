# TAATVA Obsidian - start both parts with one command:  .\start.ps1
# Opens two windows: the backend (port 8000) and the website (port 3000).

$root = $PSScriptRoot

# Backend window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; .\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

# Website window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "Backend:  http://localhost:8000/health"
Write-Host "Website:  http://localhost:3000"
