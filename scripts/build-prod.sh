#!/usr/bin/env bash
# Genera el jar de producción del backend, sin ejecutar tests y sin herramientas de desarrollo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

"${REPO_ROOT}/backend/mvnw" -f "${REPO_ROOT}/backend/pom.xml" -Pprod -DskipTests clean package

echo "==> Jar generado en ${REPO_ROOT}/backend/target/evm-backend.jar"
