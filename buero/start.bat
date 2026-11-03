@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt. Bitte von https://nodejs.org installieren (LTS). & pause & exit /b)
start "" http://localhost:4321
node server.js
pause
