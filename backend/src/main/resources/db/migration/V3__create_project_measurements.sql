-- Histórico de mediciones: la fotografía de un proyecto en una fecha de corte.
--
-- Solo se guardan las cuatro cifras base (BAC, PV, EV y AC). Los índices no se almacenan: se
-- calculan al leer con el mismo servicio de dominio que usa el análisis en vivo, de modo que el
-- histórico no puede desincronizarse del cálculo vigente.
--
-- Se usa CREATE TABLE IF NOT EXISTS por la misma razón que en V1: la base local puede haber sido
-- preparada a mano con db/init.sql y ambas rutas de inicialización deben poder convivir.

-- Cortes del proyecto
CREATE TABLE IF NOT EXISTS project_measurements (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cutoff_date DATE NOT NULL,
    notes VARCHAR(500),
    budget_at_completion NUMERIC(19,2) NOT NULL CHECK (budget_at_completion >= 0),
    planned_value NUMERIC(19,2) NOT NULL CHECK (planned_value >= 0),
    earned_value NUMERIC(19,2) NOT NULL CHECK (earned_value >= 0),
    actual_cost NUMERIC(19,2) NOT NULL CHECK (actual_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Dos cortes del mismo proyecto en la misma fecha no significan nada y romperían el orden de
    -- la gráfica: la serie temporal dejaría de tener un punto por fecha. Para rectificar un corte
    -- se borra y se vuelve a tomar.
    CONSTRAINT uq_project_measurements_project_cutoff UNIQUE (project_id, cutoff_date)
);

-- La serie temporal siempre se pide por proyecto y ordenada por fecha de corte.
CREATE INDEX IF NOT EXISTS idx_project_measurements_project_cutoff
    ON project_measurements(project_id, cutoff_date);

-- Líneas del corte: las cifras de cada actividad en esa fecha
CREATE TABLE IF NOT EXISTS project_measurement_activities (
    id BIGSERIAL PRIMARY KEY,
    measurement_id BIGINT NOT NULL REFERENCES project_measurements(id) ON DELETE CASCADE,
    -- activity_id NO tiene clave foránea a activities a propósito. La actividad puede eliminarse
    -- o renombrarse después del corte y el histórico debe sobrevivir a eso: es un registro de lo
    -- que se sabía en su fecha, no una vista de los datos actuales. Por eso se guarda también
    -- activity_name, y por eso este identificador es solo una referencia informativa.
    activity_id BIGINT,
    activity_name VARCHAR(120) NOT NULL,
    budget_at_completion NUMERIC(19,2) NOT NULL CHECK (budget_at_completion >= 0),
    planned_value NUMERIC(19,2) NOT NULL CHECK (planned_value >= 0),
    earned_value NUMERIC(19,2) NOT NULL CHECK (earned_value >= 0),
    actual_cost NUMERIC(19,2) NOT NULL CHECK (actual_cost >= 0)
);

-- Las líneas siempre se leen completas junto con su corte.
CREATE INDEX IF NOT EXISTS idx_project_measurement_activities_measurement_id
    ON project_measurement_activities(measurement_id);
