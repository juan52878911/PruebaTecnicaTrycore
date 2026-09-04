package com.trycore.evm.domain.model;

import java.time.LocalDate;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Fechas de una actividad: las que el plan previó y las que ocurrieron de verdad.
 *
 * <p>Las cuatro son opcionales, porque una actividad puede registrarse antes de tener fechas
 * cerradas y porque las reales no existen hasta que la actividad empieza. Lo que sí se valida es
 * la coherencia: un fin nunca puede ser anterior a su inicio.
 *
 * <p>Las fechas no intervienen en el cálculo de los indicadores, que se basa en porcentajes de
 * avance. Sirven para situar la actividad en el tiempo: línea base de la curva planificada,
 * diagramas de barras y detección de actividades vencidas.
 *
 * @param plannedStart fecha de inicio prevista
 * @param plannedEnd   fecha de fin prevista
 * @param actualStart  fecha de inicio real
 * @param actualEnd    fecha de fin real
 */
public record ActivitySchedule(
        LocalDate plannedStart,
        LocalDate plannedEnd,
        LocalDate actualStart,
        LocalDate actualEnd) {

    private static final ActivitySchedule EMPTY = new ActivitySchedule(null, null, null, null);

    public ActivitySchedule {
        requireOrdered(plannedStart, plannedEnd, "planificada");
        requireOrdered(actualStart, actualEnd, "real");
    }

    /** Actividad sin ninguna fecha registrada. Se usa en vez de un nulo para no propagarlo. */
    public static ActivitySchedule empty() {
        return EMPTY;
    }

    /** Indica si no hay ninguna fecha registrada. */
    public boolean isEmpty() {
        return plannedStart == null && plannedEnd == null && actualStart == null && actualEnd == null;
    }

    private static void requireOrdered(final LocalDate start, final LocalDate end, final String label) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new InvalidActivityException(
                    "La fecha de fin " + label + " no puede ser anterior a la de inicio " + label);
        }
    }
}
