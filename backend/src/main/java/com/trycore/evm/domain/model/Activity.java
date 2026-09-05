package com.trycore.evm.domain.model;

import java.time.Instant;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Actividad de un proyecto con las cifras necesarias para calcular su Valor Ganado.
 *
 * <p>Cuando la regla de medición es la de hitos ponderados, el porcentaje de avance real de
 * {@code figures} NO es un dato de entrada: es una proyección de la tabla de hitos, y se
 * materializa al construir la actividad en {@link #create} y en {@link #update}. Se materializa en
 * vez de calcularse al vuelo por dos motivos. El primero es que así el cálculo de Valor Ganado no
 * necesita conocer los hitos: la actividad le llega con su porcentaje ya resuelto y la regla de
 * hitos recorre el mismo camino, ya probado, que el porcentaje completado. El segundo es que lo
 * que se guarda coincide con lo que se responde, de modo que no existen dos fuentes de verdad
 * sobre el mismo avance.
 *
 * @param id        identificador asignado por la persistencia, nulo antes de guardar
 * @param projectId identificador del proyecto al que pertenece
 * @param name      nombre no vacío de hasta {@link #NAME_MAX_LENGTH} caracteres
 * @param figures   cifras de presupuesto, avance y costo
 * @param schedule  fechas previstas y reales; nunca nulo, puede estar vacío
 * @param progress  regla con la que la actividad reconoce valor y sus hitos; nunca nulo
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

    /**
     * Actividad nueva, todavía sin identificador ni fechas de auditoría. Si la regla es la de hitos
     * ponderados, el avance real que se reciba se descarta y se sustituye por el derivado.
     */
    public static Activity create(
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule,
            final ProgressMeasurement progress) {
        return new Activity(
                null, projectId, name, derivedFigures(figures, progress), schedule, progress, null, null);
    }

    /** Copia con nuevo nombre, cifras y calendario, conservando la regla de medición actual. */
    public Activity update(
            final String newName, final ActivityFigures newFigures, final ActivitySchedule newSchedule) {
        return update(newName, newFigures, newSchedule, progress);
    }

    /**
     * Copia con nuevo nombre, cifras, calendario y regla, conservando identidad y auditoría. Si la
     * nueva regla es la de hitos ponderados, el avance real pasa a ser el derivado de sus hitos.
     */
    public Activity update(
            final String newName,
            final ActivityFigures newFigures,
            final ActivitySchedule newSchedule,
            final ProgressMeasurement newProgress) {
        final ProgressMeasurement mergedProgress = keepMilestonesIfNotResent(newProgress);
        return new Activity(
                id,
                projectId,
                newName,
                derivedFigures(newFigures, mergedProgress),
                newSchedule,
                mergedProgress,
                createdAt,
                updatedAt);
    }

    /**
     * Indica si la actividad ha arrancado. Se toma de la fecha real de inicio o de un avance
     * declarado mayor que cero: es una unión, así que las dos señales no pueden contradecirse, y
     * cubre tanto el caso de quien registra la fecha sin estimar avance como el contrario.
     */
    public boolean started() {
        return schedule.actualStart() != null || figures.actualProgressPercent().signum() > 0;
    }

    /**
     * Una modificación que no trae hitos conserva los que ya había. Cambiar de regla no borra
     * trabajo declarado: la tabla sobrevive al cambio y vuelve a gobernar el avance si la
     * actividad regresa a la regla de hitos. Una regla de hitos nunca llega aquí con la lista
     * vacía, porque {@link ProgressMeasurement} no admite esa combinación.
     */
    private ProgressMeasurement keepMilestonesIfNotResent(final ProgressMeasurement newProgress) {
        if (newProgress == null || !newProgress.milestones().isEmpty()) {
            return newProgress;
        }
        return newProgress.withMilestones(progress.milestones());
    }

    /**
     * Sustituye el avance real por el derivado de los hitos cuando la regla lo exige. El resto de
     * cifras se conserva tal cual llegó.
     */
    private static ActivityFigures derivedFigures(
            final ActivityFigures figures, final ProgressMeasurement progress) {
        if (figures == null || progress == null) {
            return figures;
        }
        return progress.derivedProgressPercent()
                .map(derived -> new ActivityFigures(
                        figures.budgetAtCompletion(),
                        figures.plannedProgressPercent(),
                        derived,
                        figures.actualCost()))
                .orElse(figures);
    }
}
