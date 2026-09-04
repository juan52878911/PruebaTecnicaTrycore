#!/usr/bin/env bash
# Levanta PostgreSQL local con docker-compose y arranca el backend en el perfil dev.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

# shellcheck source=lib/wait-for-postgres.sh
source "${REPO_ROOT}/scripts/lib/wait-for-postgres.sh"

wait_for_postgres "${REPO_ROOT}"

echo "==> Arrancando el backend en el perfil dev..."
"${REPO_ROOT}/backend/mvnw" -f "${REPO_ROOT}/backend/pom.xml" spring-boot:run -Pdev
