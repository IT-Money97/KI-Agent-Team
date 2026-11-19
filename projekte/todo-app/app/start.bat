@echo off
REM Startet die Todo-App lokal (benoetigt nur Node.js >= 18) und oeffnet den Browser.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js fehlt: https://nodejs.org & pause & exit /b 1)
node server.mjs --open
pause
