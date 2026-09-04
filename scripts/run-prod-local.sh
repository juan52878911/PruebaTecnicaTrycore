#!/usr/bin/env bash
# Levanta PostgreSQL local con docker-compose y arranca el jar de produccion apuntando a el.
# Los valores por defecto de DB_URL, DB_USER y DB_PASSWORD solo existen en este script, para
# reproducir en local el mismo Postgres de docker-compose; en un entorno real esas variables
# las define el sistema de despliegue, nunca este script.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

JAR_PATH="${REPO_ROOT}/backend/target/evm-backend.jar"
if [ ! -f "${JAR_PATH}" ]; then
    echo "==> No se encontro ${JAR_PATH}. Ejecuta primero scripts/build-prod.sh."
    exit 1
fi

echo "==> Levantando PostgreSQL local con docker-compose..."
docker compose up -d postgres

echo "==> Esperando a que PostgreSQL este saludable..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' evm-postgres 2>/dev/null)" = "healthy" ]; do
    sleep 2
    echo "    esperando..."
done
echo "==> PostgreSQL listo."

export SPRING_PROFILES_ACTIVE=prod
export DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/evm}"
export DB_USER="${DB_USER:-evm}"
export DB_PASSWORD="${DB_PASSWORD:-evm}"

echo "==> Arrancando el jar de produccion..."
java -jar "${JAR_PATH}"
