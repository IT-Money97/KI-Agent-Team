#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js fehlt. Bitte von https://nodejs.org installieren (LTS)."; exit 1; }
( sleep 1; (command -v open >/dev/null && open http://localhost:4321) || (command -v xdg-open >/dev/null && xdg-open http://localhost:4321) ) >/dev/null 2>&1 &
node server.js
