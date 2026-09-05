#!/usr/bin/env bash
# Arranca el frontend en modo desarrollo, en http://localhost:4200.
#
# Habla con el backend en http://localhost:8080 por CORS, no por proxy: el origen 4200 está
# declarado en evm.cors.allowed-origins del perfil dev. Levanta antes el backend con
# ./scripts/run-dev.sh o las peticiones fallarán con un error de red.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/frontend"

if [ ! -d node_modules ]; then
    echo "[+] Instalando dependencias del frontend"
    npm ci
fi

echo "[+] ng serve en http://localhost:4200"
npm start
