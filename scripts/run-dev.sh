#!/usr/bin/env bash
# Levanta PostgreSQL local con docker-compose y arranca el backend en el perfil dev.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "==> Levantando PostgreSQL local con docker-compose..."
docker compose up -d postgres

echo "==> Esperando a que PostgreSQL esté saludable..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' evm-postgres 2>/dev/null)" = "healthy" ]; do
    sleep 2
    echo "    esperando..."
done
echo "==> PostgreSQL listo."

echo "==> Arrancando el backend en el perfil dev..."
"${REPO_ROOT}/backend/mvnw" -f "${REPO_ROOT}/backend/pom.xml" spring-boot:run -Pdev
