#!/usr/bin/env bash
# Verificación completa del frontend: formato, lint, pruebas unitarias y build de producción.
#
# El equivalente de scripts/run-tests.sh para el lado del navegador. Falla al primer problema.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/frontend"

if [ ! -d node_modules ]; then
    echo "[+] Instalando dependencias del frontend"
    npm ci
fi

echo "[+] Comprobando formato"
npx prettier --check "src/**/*.{ts,html,css}"

echo "[+] Lint"
npm run lint

echo "[+] Pruebas unitarias"
npm test

echo "[+] Build de producción"
npm run build

echo "[ok] Frontend verificado"
