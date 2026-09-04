#!/usr/bin/env bash
# Levanta PostgreSQL local con docker-compose y arranca el jar de producción apuntando a él.
# Los valores por defecto de DB_URL, DB_USER y DB_PASSWORD solo existen en este script, para
# reproducir en local el mismo Postgres de docker-compose; en un entorno real esas variables
# las define el sistema de despliegue, nunca este script.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# shellcheck source=lib/wait-for-postgres.sh
source "${REPO_ROOT}/scripts/lib/wait-for-postgres.sh"

JAR_PATH="${REPO_ROOT}/backend/target/evm-backend.jar"
if [ ! -f "${JAR_PATH}" ]; then
    echo "==> No se encontró ${JAR_PATH}. Ejecuta primero scripts/build-prod.sh."
    exit 1
fi

wait_for_postgres "${REPO_ROOT}"

export SPRING_PROFILES_ACTIVE=prod
export DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/evm}"
export DB_USER="${DB_USER:-evm}"
export DB_PASSWORD="${DB_PASSWORD:-evm}"

echo "==> Arrancando el jar de producción..."
java -jar "${JAR_PATH}"
