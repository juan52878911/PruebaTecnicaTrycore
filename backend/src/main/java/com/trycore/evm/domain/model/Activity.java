package com.trycore.evm.domain.model;

import java.time.Instant;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Actividad de un proyecto con las cifras necesarias para calcular su Valor Ganado.
 *
 * @param id        identificador asignado por la persistencia, nulo antes de guardar
 * @param projectId identificador del proyecto al que pertenece
 * @param name      nombre no vacío de hasta {@link #NAME_MAX_LENGTH} caracteres
 * @param figures   cifras de presupuesto, avance y costo
 * @param schedule  fechas previstas y reales; nunca nulo, puede estar vacío
 * @param progress  regla con la que la actividad reconoce valor; nunca nulo
 * @param createdAt fecha de creación, nula antes de guardar
 * @param updatedAt fecha de última modificación, nula antes de guardar
 */
public record Activity(
        Long id,
        Long projectId,
        String name,
        ActivityFigures figures,
        ActivitySchedule schedule,
        ProgressMeasurement progress,
        Instant createdAt,
        Instant updatedAt) {

    public static final int NAME_MAX_LENGTH = 120;

    public Activity {
        if (projectId == null) {
            throw new InvalidActivityException("La actividad debe pertenecer a un proyecto");
        }
        if (name == null || name.isBlank()) {
            throw new InvalidActivityException("El nombre de la actividad es obligatorio");
        }
        if (name.length() > NAME_MAX_LENGTH) {
            throw new InvalidActivityException(
                    "El nombre de la actividad no puede superar " + NAME_MAX_LENGTH + " caracteres");
        }
        if (figures == null) {
            throw new InvalidActivityException("Las cifras de la actividad son obligatorias");
        }
        // Un calendario vacío evita propagar nulos a los adaptadores y a las respuestas del API.
        schedule = schedule == null ? ActivitySchedule.empty() : schedule;
        progress = progress == null ? ProgressMeasurement.percentComplete() : progress;
    }

    /**
     * Constructor con la forma anterior a que existiera la regla de medición, que asume la de
     * siempre. Existe para que el código que no elige regla no tenga que nombrarla.
     */
    public Activity(
            final Long id,
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule,
            final Instant createdAt,
            final Instant updatedAt) {
        this(id, projectId, name, figures, schedule, ProgressMeasurement.percentComplete(), createdAt, updatedAt);
    }

    /** Actividad nueva con la regla de medición por defecto. */
    public static Activity create(
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule) {
        return create(projectId, name, figures, schedule, ProgressMeasurement.percentComplete());
    }

    /** Actividad nueva, todavía sin identificador ni fechas de auditoría. */
    public static Activity create(
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule,
            final ProgressMeasurement progress) {
        return new Activity(null, projectId, name, figures, schedule, progress, null, null);
    }

    /** Copia con nuevo nombre, cifras y calendario, conservando la regla de medición actual. */
    public Activity update(
            final String newName, final ActivityFigures newFigures, final ActivitySchedule newSchedule) {
        return update(newName, newFigures, newSchedule, progress);
    }

    /** Copia con nuevo nombre, cifras, calendario y regla, conservando identidad y auditoría. */
    public Activity update(
            final String newName,
            final ActivityFigures newFigures,
            final ActivitySchedule newSchedule,
            final ProgressMeasurement newProgress) {
        return new Activity(id, projectId, newName, newFigures, newSchedule, newProgress, createdAt, updatedAt);
    }

    /**
     * Indica si la actividad ha arrancado. Se toma de la fecha real de inicio o de un avance
     * declarado mayor que cero: es una unión, así que las dos señales no pueden contradecirse, y
     * cubre tanto el caso de quien registra la fecha sin estimar avance como el contrario.
     */
    public boolean started() {
        return schedule.actualStart() != null || figures.actualProgressPercent().signum() > 0;
    }
}
