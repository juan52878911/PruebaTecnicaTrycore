#!/usr/bin/env bash
# Regenera db/init.sql concatenando las migraciones de Flyway y la semilla de demostración.
#
# El enunciado pide un script de inicialización de la base de datos. La fuente de verdad del esquema
# es Flyway, así que mantener db/init.sql a mano garantizaría que antes o después divergiera del
# esquema real. Este script lo genera, de modo que la única forma de actualizarlo sea volver a
# derivarlo de las migraciones.
#
# Uso: ./scripts/build-init-sql.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_DIR="$REPO_ROOT/backend/src/main/resources/db/migration"
SEED_FILE="$REPO_ROOT/backend/src/main/resources/db/seed/dev/R__demo_data.sql"
OUTPUT_FILE="$REPO_ROOT/db/init.sql"

{
    cat <<'HEADER'
-- Script de inicialización de la base de datos PostgreSQL.
--
-- GENERADO: no se edita a mano. Es la concatenación de las migraciones de Flyway
-- (backend/src/main/resources/db/migration) y de la semilla de demostración del perfil dev
-- (backend/src/main/resources/db/seed/dev/R__demo_data.sql). Para regenerarlo:
--
--     ./scripts/build-init-sql.sh
--
-- La fuente de verdad del esquema es Flyway: la aplicación crea y migra las tablas al arrancar.
-- Este fichero existe porque el enunciado pide un script de inicialización, y sirve para preparar
-- la base a mano:
--
--     psql -U evm -d evm -f db/init.sql
--
-- docker-compose no lo monta a propósito, para que no haya dos caminos de inicialización que
-- puedan divergir en silencio. Todo el contenido es idempotente.
HEADER

    for migration in "$MIGRATION_DIR"/V*.sql; do
        printf '\n-- =============================================================================\n'
        printf -- '-- %s\n' "$(basename "$migration")"
        printf -- '-- =============================================================================\n\n'
        cat "$migration"
    done

    printf '\n-- =============================================================================\n'
    printf -- '-- %s (datos de demostración, solo perfil dev)\n' "$(basename "$SEED_FILE")"
    printf -- '-- =============================================================================\n\n'
    cat "$SEED_FILE"
} > "$OUTPUT_FILE"

echo "[ok] $OUTPUT_FILE regenerado desde $(ls "$MIGRATION_DIR"/V*.sql | wc -l | tr -d ' ') migraciones y la semilla"
