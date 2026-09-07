#!/bin/sh
# Arranque del frontend dentro del contenedor de desarrollo.
#
# Instala las dependencias solo cuando package-lock.json no coincide con lo que npm dejó instalado
# en node_modules, de modo que un reinicio del contenedor no vuelva a descargar todo. Después
# levanta el servidor de desarrollo escuchando en todas las interfaces, que es lo que hace falta
# para que el puerto publicado por docker-compose llegue al proceso.
#
# El sondeo de cambios (--poll) es necesario porque los eventos del sistema de ficheros del
# anfitrión no siempre cruzan el montaje del volumen.
set -eu

POLL_INTERVAL_MS=2000
INSTALLED_LOCK="node_modules/.package-lock.json"

if [ ! -f "${INSTALLED_LOCK}" ] || ! cmp -s package-lock.json "${INSTALLED_LOCK}.source"; then
    echo "[+] Instalando dependencias del frontend"
    npm ci --no-audit --no-fund
    cp package-lock.json "${INSTALLED_LOCK}.source"
fi

echo "[+] ng serve en http://localhost:4200"
exec npx ng serve --host 0.0.0.0 --port 4200 --poll "${POLL_INTERVAL_MS}"
