#!/usr/bin/env bash
# Ejecuta la verificación completa del backend en el perfil test: Checkstyle, tests unitarios,
# ArchUnit, tests de integración con Testcontainers y el umbral de cobertura de JaCoCo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

"${REPO_ROOT}/backend/mvnw" -f "${REPO_ROOT}/backend/pom.xml" verify -Ptest

# El informe agregado suma la cobertura de los tests unitarios y la de los de integración. El de
# target/site/jacoco solo tiene los unitarios y da una imagen incompleta de los adaptadores.
JACOCO_REPORT="${REPO_ROOT}/backend/target/site/jacoco-merged/index.html"
echo "==> Informe de cobertura JaCoCo (unitarios + integración): ${JACOCO_REPORT}"
