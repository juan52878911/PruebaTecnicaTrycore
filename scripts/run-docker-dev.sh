#!/usr/bin/env bash
# Levanta el entorno de desarrollo completo en contenedores: PostgreSQL, backend y frontend.
#
# Es la alternativa a run-dev.sh + run-frontend.sh cuando no se quiere instalar Java ni Node en la
# máquina. El código se monta desde el repositorio, así que los cambios se ven sin reconstruir.
# La primera ejecución tarda varios minutos: descarga Maven, las dependencias del backend y las del
# frontend en volúmenes que se reutilizan después.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "==> Levantando PostgreSQL, backend y frontend con docker compose..."
docker compose up --build "$@"
