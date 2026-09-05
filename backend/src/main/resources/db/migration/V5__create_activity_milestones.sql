-- Hitos ponderados de una actividad: el desglose del que se deriva su avance real cuando la regla
-- de medición es WEIGHTED_MILESTONES.
--
-- La invariante central de esta tabla es que los pesos de los hitos de una misma actividad sumen
-- exactamente 100. NO se comprueba aquí, y es una decisión, no un olvido: PostgreSQL solo puede
-- expresar restricciones sobre una fila, y una suma cruza todas las filas de la actividad. Hacerla
-- cumplir en la base exigiría un disparador que recorriera el conjunto en cada INSERT, UPDATE y
-- DELETE, es decir, lógica de negocio escrita en el motor y duplicada respecto a la del dominio.
-- Por eso la invariante vive en ProgressMeasurement y por eso el conjunto de hitos siempre se
-- escribe completo desde el caso de uso: una escritura parcial dejaría la tabla en un estado que
-- ninguna capa considera válido.
--
-- Lo que sí cabe en una fila sí se comprueba aquí: el peso positivo y acotado a 100, y la fecha de
-- cumplimiento solo en hitos cumplidos. Son la misma reglas del dominio, y tenerlas también en el
-- motor protege de las escrituras que no pasen por la aplicación.
--
-- Se usa CREATE TABLE IF NOT EXISTS por la misma razón que en V1 y V3: la base local puede haber
-- sido preparada a mano con db/init.sql y ambas rutas de inicialización deben poder convivir.

CREATE TABLE IF NOT EXISTS activity_milestones (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    weight_percent NUMERIC(5,2) NOT NULL CHECK (weight_percent > 0 AND weight_percent <= 100),
    achieved BOOLEAN NOT NULL DEFAULT false,
    achieved_on DATE,
    -- El orden del hito es su posición en la lista de la actividad, no un dato que el cliente
    -- edite: se asigna al escribir el conjunto y por eso empieza en cero y no tiene huecos.
    position INTEGER NOT NULL
);

-- Los hitos siempre se leen completos junto con su actividad.
CREATE INDEX IF NOT EXISTS idx_activity_milestones_activity_id ON activity_milestones(activity_id);

-- Dos hitos de la misma actividad en la misma posición harían ambiguo el orden de la tabla.
ALTER TABLE activity_milestones DROP CONSTRAINT IF EXISTS uq_activity_milestones_activity_position;
ALTER TABLE activity_milestones ADD CONSTRAINT uq_activity_milestones_activity_position
    UNIQUE (activity_id, position);

-- Una fecha de cumplimiento en un hito no cumplido es una contradicción, no un dato incompleto.
ALTER TABLE activity_milestones DROP CONSTRAINT IF EXISTS chk_activity_milestones_achieved_on;
ALTER TABLE activity_milestones ADD CONSTRAINT chk_activity_milestones_achieved_on
    CHECK (achieved_on IS NULL OR achieved);
