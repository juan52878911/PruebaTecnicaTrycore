-- Fechas previstas y reales de cada actividad.
--
-- Son opcionales: una actividad puede registrarse antes de tener fechas cerradas, y las reales no
-- existen hasta que empieza. No intervienen en el cálculo de los indicadores, que se basa en
-- porcentajes de avance; sirven para situar la actividad en el tiempo.
--
-- Migración aditiva: todas las columnas admiten nulos, así que las filas existentes siguen siendo
-- válidas y el contrato del API no cambia para quien no envíe fechas.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS planned_start_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS planned_end_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS actual_end_date DATE;

-- La coherencia de cada par se valida también en el dominio; aquí queda como última defensa por si
-- alguien escribe en la tabla sin pasar por la aplicación.
ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activities_planned_dates;
ALTER TABLE activities ADD CONSTRAINT chk_activities_planned_dates
    CHECK (planned_start_date IS NULL OR planned_end_date IS NULL OR planned_end_date >= planned_start_date);

ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activities_actual_dates;
ALTER TABLE activities ADD CONSTRAINT chk_activities_actual_dates
    CHECK (actual_start_date IS NULL OR actual_end_date IS NULL OR actual_end_date >= actual_start_date);
