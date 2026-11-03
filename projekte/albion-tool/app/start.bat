@echo off
setlocal
cd /d "%~dp0"
node --version >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte Node.js 18 oder neuer installieren: https://nodejs.org
  pause
  exit /b 1
)
set "OPEN_BROWSER=1"
node server.js
pause
