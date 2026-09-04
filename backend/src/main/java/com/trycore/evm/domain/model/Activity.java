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
 * @param createdAt fecha de creación, nula antes de guardar
 * @param updatedAt fecha de última modificación, nula antes de guardar
 */
public record Activity(
        Long id,
        Long projectId,
        String name,
        ActivityFigures figures,
        ActivitySchedule schedule,
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
    }

    /** Actividad nueva, todavía sin identificador ni fechas de auditoría. */
    public static Activity create(
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule) {
        return new Activity(null, projectId, name, figures, schedule, null, null);
    }

    /** Copia con nuevo nombre, cifras y calendario, conservando identidad, proyecto y auditoría. */
    public Activity update(
            final String newName, final ActivityFigures newFigures, final ActivitySchedule newSchedule) {
        return new Activity(id, projectId, newName, newFigures, newSchedule, createdAt, updatedAt);
    }
}
