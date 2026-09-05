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

-- =============================================================================
-- V1__create_projects_and_activities.sql
-- =============================================================================

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

-- =============================================================================
-- V2__add_activity_schedule.sql
-- =============================================================================

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

-- =============================================================================
-- V3__create_project_measurements.sql
-- =============================================================================

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

-- =============================================================================
-- R__demo_data.sql (datos de demostración, solo perfil dev)
-- =============================================================================

-- Migración repetible de Flyway (prefijo R__) con los datos de demostración del perfil dev.
--
-- Reproduce los cuatro proyectos de los mockups del producto para que el tablero se pueda recorrer
-- entero desde el primer arranque, incluidos los casos borde: un proyecto sin actividades, una
-- actividad sin costo real (CPI, EAC y VAC indefinidos) y un proyecto con actividades pero sin
-- cortes históricos (curva S vacía).
--
-- Es idempotente: cada INSERT lleva WHERE NOT EXISTS, de modo que volver a ejecutar la migración
-- tras cambiar su contenido no duplica filas.
--
-- Las cifras derivadas que aparecen en los comentarios (PV, EV y los índices) están calculadas a
-- mano con las fórmulas del estándar, no copiadas de la salida de la aplicación:
--   PV = BAC x % planificado / 100      EV = BAC x % real / 100
--   CPI = EV / AC                       SPI = EV / PV

-- ---------------------------------------------------------------------------------------------
-- Proyectos
-- ---------------------------------------------------------------------------------------------

INSERT INTO projects (name, description)
SELECT 'Planta Solar Norte', 'Construcción de la planta fotovoltaica del corredor norte'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Planta Solar Norte');

INSERT INTO projects (name, description)
SELECT 'Migración core bancario', 'Traslado del núcleo transaccional a la nueva plataforma'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Migración core bancario');

INSERT INTO projects (name, description)
SELECT 'Portal de autogestión', 'Portal de autoservicio para clientes empresariales'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Portal de autogestión');

-- Sin actividades a propósito: es el caso de proyecto vacío. El API devuelve 200 con sumas en 0,
-- índices nulos y estados NOT_APPLICABLE, y el tablero debe mostrar su estado vacío sin romperse.
INSERT INTO projects (name, description)
SELECT 'Data warehouse fase II', 'Segunda fase del almacén analítico corporativo'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE name = 'Data warehouse fase II');

-- ---------------------------------------------------------------------------------------------
-- Actividades
--
-- Planta Solar Norte: proyecto sobre presupuesto y atrasado.
--
-- Las cifras reproducen el artboard del panel del diseño, que es la referencia visual del
-- producto. Por eso el presupuesto suma 2 000 000: la quinta actividad, aún sin arrancar, aporta
-- los 300 000 que faltaban.
--   BAC = 500 000 + 475 000 + 325 000 + 400 000 + 300 000 = 2 000 000
--   PV  = 420 000 + 380 000 + 260 000 + 180 000 +       0 = 1 240 000
--   EV  = 398 500 + 361 000 + 240 500 + 116 000 +       0 = 1 116 000
--   AC  = 468 000 + 352 000 + 244 000 + 194 000 +       0 = 1 258 000
--   CV  = 1 116 000 - 1 258 000 = -142 000
--   SV  = 1 116 000 - 1 240 000 = -124 000
--   CPI = 1 116 000 / 1 258 000 = 0,8871   SPI = 1 116 000 / 1 240 000 = 0,9000
--   EAC = 2 000 000 x 1 258 000 / 1 116 000 = 2 254 480,29   VAC = -254 480,29
-- ---------------------------------------------------------------------------------------------

INSERT INTO activities (
    project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent,
    actual_cost, planned_start_date, planned_end_date, actual_start_date, actual_end_date)
SELECT p.id, v.name, v.bac, v.planned, v.actual, v.ac,
       v.planned_start, v.planned_end, v.actual_start, v.actual_end
FROM projects p
CROSS JOIN (VALUES
    -- PV 420 000 · EV 398 500 · CPI 0,8515 · SPI 0,9488 -> sobrecosto
    ('Obra civil — cimentación',     500000.00, 84.00, 79.70, 468000.00,
     DATE '2026-01-15', DATE '2026-04-30', DATE '2026-01-15', DATE '2026-05-20'),
    -- PV 380 000 · EV 361 000 · CPI 1,0256 · SPI 0,9500 -> en presupuesto, algo atrasada
    ('Montaje de estructuras',       475000.00, 80.00, 76.00, 352000.00,
     DATE '2026-03-01', DATE '2026-07-15', DATE '2026-03-05', NULL),
    -- PV 260 000 · EV 240 500 · CPI 0,9857 · SPI 0,9250 -> atrasada
    ('Instalación eléctrica',        325000.00, 80.00, 74.00, 244000.00,
     DATE '2026-05-10', DATE '2026-09-20', DATE '2026-05-18', NULL),
    -- PV 180 000 · EV 116 000 · CPI 0,5979 · SPI 0,6444 -> crítica
    ('Pruebas y puesta en marcha',   400000.00, 45.00, 29.00, 194000.00,
     DATE '2026-08-01', DATE '2026-11-30', DATE '2026-08-10', NULL),
    -- Sin arrancar a la fecha de corte: PV, EV y AC valen 0, así que ni el CPI ni el SPI están
    -- definidos. Es el caso borde de la actividad planificada que todavía no ha empezado, distinto
    -- del de "Integración con el core", que sí tiene avance planificado pero ningún costo.
    ('Conexión a la red',            300000.00,  0.00,  0.00,      0.00,
     DATE '2026-11-01', DATE '2027-01-31', NULL, NULL)
) AS v(name, bac, planned, actual, ac, planned_start, planned_end, actual_start, actual_end)
WHERE p.name = 'Planta Solar Norte'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = v.name);

-- Migración core bancario: bajo presupuesto y en cronograma.
--   PV = 200 000 + 266 000 + 126 000 = 592 000
--   EV = 200 000 + 273 600 + 128 800 = 602 400
--   AC = 185 000 + 262 000 + 124 900 = 571 900
--   CPI = 602 400 / 571 900 = 1,0533   SPI = 602 400 / 592 000 = 1,0176
INSERT INTO activities (
    project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent,
    actual_cost, planned_start_date, planned_end_date, actual_start_date, actual_end_date)
SELECT p.id, v.name, v.bac, v.planned, v.actual, v.ac,
       v.planned_start, v.planned_end, v.actual_start, v.actual_end
FROM projects p
CROSS JOIN (VALUES
    -- PV 200 000 · EV 200 000 · CPI 1,0811 · SPI 1,0000 -> cerrada bajo presupuesto
    ('Análisis de brechas',          200000.00, 100.00, 100.00, 185000.00,
     DATE '2026-02-01', DATE '2026-04-15', DATE '2026-02-03', DATE '2026-04-10'),
    -- PV 266 000 · EV 273 600 · CPI 1,0443 · SPI 1,0286 -> adelantada
    ('Migración de datos',           380000.00,  70.00,  72.00, 262000.00,
     DATE '2026-04-01', DATE '2026-10-31', DATE '2026-04-06', NULL),
    -- PV 126 000 · EV 128 800 · CPI 1,0312 · SPI 1,0222 -> adelantada
    ('Certificación regulatoria',    280000.00,  45.00,  46.00, 124900.00,
     DATE '2026-06-01', DATE '2026-12-15', DATE '2026-06-08', NULL)
) AS v(name, bac, planned, actual, ac, planned_start, planned_end, actual_start, actual_end)
WHERE p.name = 'Migración core bancario'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = v.name);

-- Portal de autogestión: en presupuesto pero atrasado, y con una actividad sin costo real.
--   PV = 90 000 + 81 600 + 9 000 = 180 600
--   EV = 85 500 + 64 000 + 3 600 = 153 100
--   AC = 88 000 + 72 000 +     0 = 160 000
--   CPI = 153 100 / 160 000 = 0,9569   SPI = 153 100 / 180 600 = 0,8477
INSERT INTO activities (
    project_id, name, budget_at_completion, planned_progress_percent, actual_progress_percent,
    actual_cost, planned_start_date, planned_end_date, actual_start_date, actual_end_date)
SELECT p.id, v.name, v.bac, v.planned, v.actual, v.ac,
       v.planned_start, v.planned_end, v.actual_start, v.actual_end
FROM projects p
CROSS JOIN (VALUES
    -- PV 90 000 · EV 85 500 · CPI 0,9716 · SPI 0,9500
    ('Diseño de la experiencia',      90000.00, 100.00, 95.00, 88000.00,
     DATE '2026-03-01', DATE '2026-05-31', DATE '2026-03-04', DATE '2026-06-12'),
    -- PV 81 600 · EV 64 000 · CPI 0,8889 · SPI 0,7843 -> sobrecosto y atrasada
    ('Desarrollo del portal',        160000.00,  51.00, 40.00, 72000.00,
     DATE '2026-05-01', DATE '2026-10-31', DATE '2026-05-15', NULL),
    -- AC = 0: el CPI, el EAC y el VAC quedan indefinidos y el estado de costo es NOT_APPLICABLE.
    -- Es el caso borde que el tablero debe mostrar como "N/A" y nunca como cero.
    -- PV 9 000 · EV 3 600 · SPI 0,4000
    ('Integración con el core',       90000.00,  10.00,  4.00,     0.00,
     DATE '2026-08-01', DATE '2026-12-20', DATE '2026-08-25', NULL)
) AS v(name, bac, planned, actual, ac, planned_start, planned_end, actual_start, actual_end)
WHERE p.name = 'Portal de autogestión'
  AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.project_id = p.id AND a.name = v.name);

-- ---------------------------------------------------------------------------------------------
-- Cortes históricos
--
-- Dan serie a la curva S. El último corte de cada proyecto coincide con su consolidado en vivo,
-- de modo que la gráfica y las tarjetas del panel terminan en el mismo punto.
--
-- Portal de autogestión no recibe ningún corte a propósito: es el caso de proyecto con actividades
-- pero sin histórico, donde la curva S debe mostrar su estado vacío.
-- ---------------------------------------------------------------------------------------------

INSERT INTO project_measurements (
    project_id, cutoff_date, notes, budget_at_completion, planned_value, earned_value, actual_cost)
SELECT p.id, v.cutoff, v.notes, v.bac, v.pv, v.ev, v.ac
FROM projects p
CROSS JOIN (VALUES
    (DATE '2026-01-31', 'Cierre de enero',   2000000.00,  105000.00,   95000.00,  100000.00),
    (DATE '2026-02-28', 'Cierre de febrero', 2000000.00,  235000.00,  210000.00,  228000.00),
    (DATE '2026-03-31', 'Cierre de marzo',   2000000.00,  400000.00,  360000.00,  396000.00),
    (DATE '2026-04-30', 'Cierre de abril',   2000000.00,  550000.00,  505000.00,  560000.00),
    (DATE '2026-05-31', 'Cierre de mayo',    2000000.00,  690000.00,  636000.00,  694000.00),
    (DATE '2026-06-30', 'Cierre de junio',   2000000.00,  850000.00,  788500.00,  850000.00),
    (DATE '2026-07-31', 'Cierre de julio',   2000000.00,  990000.00,  918500.00,  984000.00),
    -- Coincide con el consolidado en vivo: CPI 0,8871 y SPI 0,9000.
    (DATE '2026-08-31', 'Cierre de agosto',  2000000.00, 1240000.00, 1116000.00, 1258000.00)
) AS v(cutoff, notes, bac, pv, ev, ac)
WHERE p.name = 'Planta Solar Norte'
  AND NOT EXISTS (
      SELECT 1 FROM project_measurements m WHERE m.project_id = p.id AND m.cutoff_date = v.cutoff);

INSERT INTO project_measurements (
    project_id, cutoff_date, notes, budget_at_completion, planned_value, earned_value, actual_cost)
SELECT p.id, v.cutoff, v.notes, v.bac, v.pv, v.ev, v.ac
FROM projects p
CROSS JOIN (VALUES
    (DATE '2026-06-30', 'Cierre de junio',  860000.00, 380000.00, 392000.00, 372000.00),
    (DATE '2026-07-31', 'Cierre de julio',  860000.00, 490000.00, 500000.00, 476000.00),
    -- Coincide con el consolidado en vivo: CPI 1,0533 y SPI 1,0176.
    (DATE '2026-08-31', 'Cierre de agosto', 860000.00, 592000.00, 602400.00, 571900.00)
) AS v(cutoff, notes, bac, pv, ev, ac)
WHERE p.name = 'Migración core bancario'
  AND NOT EXISTS (
      SELECT 1 FROM project_measurements m WHERE m.project_id = p.id AND m.cutoff_date = v.cutoff);

-- ---------------------------------------------------------------------------------------------
-- Líneas de cada corte
--
-- Las cifras por actividad suman exactamente los totales del corte al que pertenecen. Una actividad
-- que aún no había arrancado en esa fecha simplemente no aparece en el corte.
-- ---------------------------------------------------------------------------------------------

INSERT INTO project_measurement_activities (
    measurement_id, activity_id, activity_name, budget_at_completion, planned_value, earned_value, actual_cost)
SELECT m.id, a.id, v.activity_name, v.bac, v.pv, v.ev, v.ac
FROM project_measurements m
JOIN projects p ON p.id = m.project_id
CROSS JOIN (VALUES
    (DATE '2026-01-31', 'Obra civil — cimentación',   500000.00,  105000.00,  95000.00, 100000.00),
    (DATE '2026-02-28', 'Obra civil — cimentación',   500000.00,  235000.00, 210000.00, 228000.00),
    (DATE '2026-03-31', 'Obra civil — cimentación',   500000.00,  360000.00, 330000.00, 372000.00),
    (DATE '2026-03-31', 'Montaje de estructuras',     475000.00,   40000.00,  30000.00,  24000.00),
    (DATE '2026-04-30', 'Obra civil — cimentación',   500000.00,  420000.00, 390000.00, 452000.00),
    (DATE '2026-04-30', 'Montaje de estructuras',     475000.00,  130000.00, 115000.00, 108000.00),
    (DATE '2026-05-31', 'Obra civil — cimentación',   500000.00,  420000.00, 396000.00, 462000.00),
    (DATE '2026-05-31', 'Montaje de estructuras',     475000.00,  230000.00, 205000.00, 196000.00),
    (DATE '2026-05-31', 'Instalación eléctrica',      325000.00,   40000.00,  35000.00,  36000.00),
    (DATE '2026-06-30', 'Obra civil — cimentación',   500000.00,  420000.00, 398500.00, 468000.00),
    (DATE '2026-06-30', 'Montaje de estructuras',     475000.00,  320000.00, 290000.00, 280000.00),
    (DATE '2026-06-30', 'Instalación eléctrica',      325000.00,  110000.00, 100000.00, 102000.00),
    (DATE '2026-07-31', 'Obra civil — cimentación',   500000.00,  420000.00, 398500.00, 468000.00),
    (DATE '2026-07-31', 'Montaje de estructuras',     475000.00,  380000.00, 350000.00, 340000.00),
    (DATE '2026-07-31', 'Instalación eléctrica',      325000.00,  190000.00, 170000.00, 176000.00),
    (DATE '2026-08-31', 'Obra civil — cimentación',   500000.00,  420000.00, 398500.00, 468000.00),
    (DATE '2026-08-31', 'Montaje de estructuras',     475000.00,  380000.00, 361000.00, 352000.00),
    (DATE '2026-08-31', 'Instalación eléctrica',      325000.00,  260000.00, 240500.00, 244000.00),
    (DATE '2026-08-31', 'Pruebas y puesta en marcha', 400000.00,  180000.00, 116000.00, 194000.00)
) AS v(cutoff, activity_name, bac, pv, ev, ac)
LEFT JOIN activities a ON a.project_id = p.id AND a.name = v.activity_name
WHERE p.name = 'Planta Solar Norte'
  AND m.cutoff_date = v.cutoff
  AND NOT EXISTS (
      SELECT 1 FROM project_measurement_activities l
      WHERE l.measurement_id = m.id AND l.activity_name = v.activity_name);

INSERT INTO project_measurement_activities (
    measurement_id, activity_id, activity_name, budget_at_completion, planned_value, earned_value, actual_cost)
SELECT m.id, a.id, v.activity_name, v.bac, v.pv, v.ev, v.ac
FROM project_measurements m
JOIN projects p ON p.id = m.project_id
CROSS JOIN (VALUES
    (DATE '2026-06-30', 'Análisis de brechas',       200000.00, 200000.00, 200000.00, 185000.00),
    (DATE '2026-06-30', 'Migración de datos',        380000.00, 150000.00, 160000.00, 152000.00),
    (DATE '2026-06-30', 'Certificación regulatoria', 280000.00,  30000.00,  32000.00,  35000.00),
    (DATE '2026-07-31', 'Análisis de brechas',       200000.00, 200000.00, 200000.00, 185000.00),
    (DATE '2026-07-31', 'Migración de datos',        380000.00, 210000.00, 218000.00, 210000.00),
    (DATE '2026-07-31', 'Certificación regulatoria', 280000.00,  80000.00,  82000.00,  81000.00),
    (DATE '2026-08-31', 'Análisis de brechas',       200000.00, 200000.00, 200000.00, 185000.00),
    (DATE '2026-08-31', 'Migración de datos',        380000.00, 266000.00, 273600.00, 262000.00),
    (DATE '2026-08-31', 'Certificación regulatoria', 280000.00, 126000.00, 128800.00, 124900.00)
) AS v(cutoff, activity_name, bac, pv, ev, ac)
LEFT JOIN activities a ON a.project_id = p.id AND a.name = v.activity_name
WHERE p.name = 'Migración core bancario'
  AND m.cutoff_date = v.cutoff
  AND NOT EXISTS (
      SELECT 1 FROM project_measurement_activities l
      WHERE l.measurement_id = m.id AND l.activity_name = v.activity_name);

-- ---------------------------------------------------------------------------------------------
-- Realineación de los datos de demostración
--
-- Los INSERT de arriba llevan WHERE NOT EXISTS para ser idempotentes, lo que significa que en una
-- base que ya cargó una versión anterior de esta semilla no actualizan nada: las filas ya existen
-- y se quedan con las cifras viejas. Flyway sí vuelve a ejecutar esta migración cuando cambia su
-- contenido, así que las correcciones se aplican aquí de forma explícita.
--
-- Solo afecta a las filas de demostración del perfil dev, identificadas por nombre. Si alguien
-- editó a mano el proyecto de ejemplo, este bloque devuelve sus cifras a las del diseño; es
-- deliberado, porque son datos de muestra y no de trabajo.
-- ---------------------------------------------------------------------------------------------

UPDATE activities a
SET actual_progress_percent = 79.70
FROM projects p
WHERE a.project_id = p.id
  AND p.name = 'Planta Solar Norte'
  AND a.name = 'Obra civil — cimentación'
  AND a.actual_progress_percent <> 79.70;

UPDATE project_measurements m
SET budget_at_completion = 2000000.00
FROM projects p
WHERE m.project_id = p.id
  AND p.name = 'Planta Solar Norte'
  AND m.budget_at_completion <> 2000000.00;

UPDATE project_measurements m
SET earned_value = v.earned_value
FROM projects p,
     (VALUES
         (DATE '2026-06-30', 788500.00),
         (DATE '2026-07-31', 918500.00),
         (DATE '2026-08-31', 1116000.00)
     ) AS v(cutoff_date, earned_value)
WHERE m.project_id = p.id
  AND p.name = 'Planta Solar Norte'
  AND m.cutoff_date = v.cutoff_date
  AND m.earned_value <> v.earned_value;

UPDATE project_measurement_activities l
SET earned_value = 398500.00
FROM project_measurements m
JOIN projects p ON p.id = m.project_id
WHERE l.measurement_id = m.id
  AND p.name = 'Planta Solar Norte'
  AND l.activity_name = 'Obra civil — cimentación'
  AND m.cutoff_date >= DATE '2026-06-30'
  AND l.earned_value <> 398500.00;
