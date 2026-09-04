-- Script de inicialización de la base de datos, entregable pedido por Trycore.
--
-- Sirve para crear el esquema y los datos de demostración a mano, sin arrancar el backend: por
-- ejemplo con `psql -U evm -d evm -f db/init.sql` sobre una base recién creada.
--
-- NO lo monta docker-compose. En el flujo normal la única fuente del esquema es Flyway
-- (backend/src/main/resources/db/migration), y los datos de demostración los carga la migración
-- repetible del perfil dev (backend/src/main/resources/db/seed/dev). Tener dos caminos ejecutándose
-- sobre la misma base hacía que el esquema pudiera diverger en silencio si solo se actualizaba uno,
-- y obligaba a relajar la validación de Flyway para que conviviesen.
--
-- Si se usa este script, su contenido debe seguir coincidiendo con la migración V1.

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

-- Datos de demostración
INSERT INTO projects (name, description)
SELECT 'Plataforma de pagos', 'Proyecto de demostración para el análisis de Valor Ganado'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Plataforma de pagos');

INSERT INTO activities (project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent, actual_cost)
SELECT p.id, 'Diseño de arquitectura', 100000.00, 50.00, 40.00, 60000.00
FROM projects p
WHERE p.name = 'Plataforma de pagos'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = 'Diseño de arquitectura');

INSERT INTO activities (project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent, actual_cost)
SELECT p.id, 'Desarrollo del API', 250000.00, 40.00, 45.00, 100000.00
FROM projects p
WHERE p.name = 'Plataforma de pagos'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = 'Desarrollo del API');

INSERT INTO activities (project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent, actual_cost)
SELECT p.id, 'Pruebas de integración', 80000.00, 25.00, 0.00, 0.00
FROM projects p
WHERE p.name = 'Plataforma de pagos'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = 'Pruebas de integración');
