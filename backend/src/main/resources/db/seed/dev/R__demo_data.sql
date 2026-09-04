-- Migración repetible de Flyway (prefijo R__) con los mismos datos de demostración que
-- db/init.sql, solo para el perfil dev. Es idempotente: cada INSERT usa WHERE NOT EXISTS para
-- no duplicar filas si la migración se vuelve a ejecutar.

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
