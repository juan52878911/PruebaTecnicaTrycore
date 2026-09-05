-- Responsable del proyecto: la persona a cuyo cargo está.
--
-- El tablero muestra "24 actividades · Alicia Ramos" bajo el nombre del proyecto, y hoy esa
-- segunda mitad no existe en ninguna parte.
--
-- Migración aditiva: la columna admite nulos, así que las filas existentes siguen siendo válidas
-- y el contrato del API no cambia para quien no envíe responsable. Admite nulos a propósito y no
-- por comodidad: un proyecto puede registrarse antes de que se designe a quien lo dirige, y una
-- columna obligatoria obligaría a inventar un nombre para poder crearlo.
--
-- Se usa ADD COLUMN IF NOT EXISTS por la misma razón que en las migraciones anteriores: la base
-- local puede haber sido preparada a mano con db/init.sql y ambas rutas de inicialización deben
-- poder convivir.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS manager VARCHAR(120);
