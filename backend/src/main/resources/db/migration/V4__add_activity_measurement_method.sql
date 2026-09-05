-- Regla con la que cada actividad reconoce valor a partir de su avance.
--
-- La columna es obligatoria con valor por defecto, de modo que las filas existentes conservan el
-- comportamiento de siempre: reconocer el porcentaje declarado tal cual. Esto importa además porque
-- el seed de demostración es una migración repetible, y una columna obligatoria sin valor por
-- defecto impediría reejecutarlo.
--
-- La restricción de valores admitidos acopla el esquema al enumerado del dominio: añadir una quinta
-- regla exigirá una migración que la amplíe. Se asume a cambio de que la base rechace un valor que
-- la aplicación no sabría interpretar.

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(24) NOT NULL DEFAULT 'PERCENT_COMPLETE';

ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_activities_measurement_method;
ALTER TABLE activities ADD CONSTRAINT chk_activities_measurement_method
    CHECK (measurement_method IN ('PERCENT_COMPLETE', 'FIXED_0_100', 'FIXED_50_50', 'WEIGHTED_MILESTONES'));
