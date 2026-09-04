-- Esquema inicial: proyectos y actividades para el cálculo de Valor Ganado (EVM).
-- Se usa CREATE TABLE IF NOT EXISTS y CREATE INDEX IF NOT EXISTS porque la base local de
-- docker-compose puede haber sido inicializada ya por db/init.sql (montado como script de
-- arranque del contenedor de PostgreSQL). Ambas rutas de inicialización deben poder convivir:
-- si el esquema ya existe por db/init.sql, esta migración no falla y Flyway igual registra
-- V1 como aplicada; si la base es nueva y no pasó por db/init.sql, esta migración la crea.

-- Tabla de proyectos
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    budget_at_completion NUMERIC(19,2) NOT NULL CHECK (budget_at_completion >= 0),
    planned_progress_percent NUMERIC(5,2) NOT NULL CHECK (planned_progress_percent BETWEEN 0 AND 100),
    actual_progress_percent NUMERIC(5,2) NOT NULL CHECK (actual_progress_percent BETWEEN 0 AND 100),
    actual_cost NUMERIC(19,2) NOT NULL CHECK (actual_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para acelerar consultas por proyecto
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
