@echo off
echo ===================================================
echo   Starting Lets Care All Development Environment
echo ===================================================

echo [1/3] Starting Database (Docker)...
cd backend
docker-compose up -d
cd ..

echo [2/3] Starting Backend Server...
start "Backend API" cmd /k "cd backend && npm run start:dev"

echo [3/3] Starting Frontend Website...
start "Frontend Website" cmd /k "npm run dev"

echo ===================================================
echo   All services starting!
echo   - Backend: http://localhost:3000
echo   - Frontend: http://localhost:5173 (usually)
echo ===================================================
echo You can minimize the opened terminal windows, but DO NOT CLOSE THEM.
echo If you close them, the website will stop working.
pause
