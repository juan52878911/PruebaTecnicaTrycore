#!/usr/bin/env bash
# Pruebas de comportamiento del frontend con Playwright, en escritorio (1360 px) y móvil (375 px).
#
# No necesitan el backend: la API se simula desde el navegador. Si no hay un servidor de desarrollo
# en el puerto 4200, Playwright lo levanta y lo apaga al terminar.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/frontend"

if [ ! -d node_modules ]; then
    echo "[+] Instalando dependencias del frontend"
    npm ci
fi

if [ ! -d "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}" ] && [ ! -d "${HOME}/.cache/ms-playwright" ]; then
    echo "[+] Descargando Chromium para Playwright"
    npx playwright install chromium
fi

echo "[+] Pruebas de comportamiento"
npm run e2e "$@"

echo "[ok] Comportamiento verificado"
