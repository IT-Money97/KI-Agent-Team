#!/usr/bin/env sh
# Albion Werkbank starten (Mac/Linux). Benötigt Node.js 18+.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte Node.js 18 oder neuer installieren: https://nodejs.org"
  exit 1
fi
OPEN_BROWSER=1 exec node server.js
