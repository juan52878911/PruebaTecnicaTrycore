#!/usr/bin/env bash
# Ejecuta la verificacion completa del backend en el perfil test: Checkstyle, tests unitarios,
# ArchUnit, tests de integracion con Testcontainers y el umbral de cobertura de JaCoCo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

"${REPO_ROOT}/backend/mvnw" -f "${REPO_ROOT}/backend/pom.xml" verify -Ptest

JACOCO_REPORT="${REPO_ROOT}/backend/target/site/jacoco/index.html"
echo "==> Informe de cobertura JaCoCo: ${JACOCO_REPORT}"
