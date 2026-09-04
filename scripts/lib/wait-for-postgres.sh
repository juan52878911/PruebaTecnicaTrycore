#!/usr/bin/env bash
# Levanta el PostgreSQL local de docker-compose y espera a que su healthcheck lo declare sano.
# Se usa desde run-dev.sh y run-prod-local.sh; vivía duplicado en ambos.
# Falla con un mensaje y un código de salida distinto de cero si no llega a estar sano dentro del
# plazo: una espera sin tope deja el script colgado sin decir por qué (puerto 5432 ocupado, volumen
# antiguo con otra contraseña, imagen que no arranca) y set -euo pipefail no puede intervenir
# porque en ese bucle ningún comando devuelve error.
set -euo pipefail

CONTAINER_NAME="evm-postgres"
MAX_ATTEMPTS=60
SECONDS_BETWEEN_ATTEMPTS=2

wait_for_postgres() {
    local repo_root="$1"

    echo "==> Levantando PostgreSQL local con docker-compose..."
    docker compose -f "${repo_root}/docker-compose.yml" up -d postgres

    echo "==> Esperando a que PostgreSQL esté saludable (máximo $((MAX_ATTEMPTS * SECONDS_BETWEEN_ATTEMPTS)) s)..."
    local attempt=1
    while [ "${attempt}" -le "${MAX_ATTEMPTS}" ]; do
        local status
        status="$(docker inspect -f '{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "ausente")"
        if [ "${status}" = "healthy" ]; then
            echo "==> PostgreSQL listo."
            return 0
        fi
        sleep "${SECONDS_BETWEEN_ATTEMPTS}"
        attempt=$((attempt + 1))
    done

    echo "==> El contenedor ${CONTAINER_NAME} no llegó a estar saludable. Últimos registros:" >&2
    docker logs --tail 20 "${CONTAINER_NAME}" >&2 || true
    return 1
}
