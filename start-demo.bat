@echo off
REM Cyclowareness — one-click demo launcher.
REM Double-click this file: it starts the API and the UI in their own windows
REM and opens the browser. Close those two windows to stop the demo.

title Cyclowareness launcher
echo.
echo   Cyclowareness - starting the demo...
echo.

REM --- Backend (FastAPI on :8000) ---
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
  echo   [!] Python venv not found. Run this once inside the backend folder:
  echo       python -m venv .venv
  echo       .venv\Scripts\pip install -r requirements.txt
  echo.
  pause
  exit /b 1
)
REM APP_ENV=demo unlocks the exhibition build: seeded world, reset button,
REM synthetic simulation outcomes, and the artificial stage pacing that makes
REM the loop visibly turn. Production defaults to none of it.
cd /d "%~dp0backend"
start "Cyclowareness API" cmd /k "set APP_ENV=demo&& .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"

REM --- Frontend (Vite on :5173) ---
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo   [!] Frontend dependencies missing. Installing now ^(one-time, ~1 min^)...
  call npm install
)
start "Cyclowareness UI" cmd /k npm run dev

REM --- Give the servers a moment, then open the browser ---
echo   Waiting for the servers to come up...
timeout /t 8 /nobreak >nul
start "" http://localhost:5173

echo.
echo   Demo is running:
echo     UI   http://localhost:5173
echo     API  http://127.0.0.1:8000/api/health
echo.
echo   Login:  analyst@caspiandynamics.az / analyst123
echo.
echo   To stop: close the two windows titled "Cyclowareness API" and "Cyclowareness UI".
echo.
timeout /t 10 /nobreak >nul
