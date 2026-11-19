#!/usr/bin/env sh
# Startet die Todo-App lokal (benötigt nur Node.js >= 18) und öffnet den Browser.
cd "$(dirname "$0")" || exit 1
exec node server.mjs --open
