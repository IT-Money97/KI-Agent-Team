@echo off
title Agenten-Buero
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto keinnode
start "" "http://localhost:4321"
node server.js
echo.
echo Der Server wurde beendet.
pause
exit /b
:keinnode
echo Node.js fehlt. Bitte die LTS-Version von https://nodejs.org installieren.
pause
