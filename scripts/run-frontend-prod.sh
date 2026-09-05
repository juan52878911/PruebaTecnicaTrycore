#!/usr/bin/env bash
# Compila el frontend con el perfil de producción y lo sirve como estático en
# http://localhost:4300.
#
# El puerto es distinto del de desarrollo a propósito: así el build de producción se sirve desde
# su propio origen y ejercita CORS de verdad contra el backend en 8080, en lugar de dar por buena
# una configuración que solo funciona con el servidor de desarrollo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=4300
DIST_DIR="$REPO_ROOT/frontend/dist/frontend/browser"

cd "$REPO_ROOT/frontend"

if [ ! -d node_modules ]; then
    echo "[+] Instalando dependencias del frontend"
    npm ci
fi

echo "[+] Compilando con la configuración de producción"
npm run build

if [ ! -d "$DIST_DIR" ]; then
    echo "[x] No se encontró $DIST_DIR tras el build" >&2
    exit 1
fi

echo "[+] Sirviendo $DIST_DIR en http://localhost:$PORT"
# -P reenvía a la propia raíz las rutas que no son ficheros: sin eso, recargar en /panel daría 404
# porque el enrutador de Angular vive en el cliente.
npx --no-install http-server "$DIST_DIR" -p "$PORT" -P "http://localhost:$PORT?" --silent
