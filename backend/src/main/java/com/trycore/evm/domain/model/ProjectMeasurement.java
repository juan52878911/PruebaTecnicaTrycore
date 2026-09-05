package com.trycore.evm.domain.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.trycore.evm.domain.exception.InvalidMeasurementException;

/**
 * Fotografía del estado de un proyecto en una fecha de corte.
 *
 * <p>Es el registro que permite dibujar la evolución en el tiempo: la curva de valores acumulados y
 * la tendencia de los índices. Guarda las cifras base del proyecto y las de cada actividad, no los
 * índices, que se derivan al leer.
 *
 * <p>Una medición es inmutable por naturaleza. Si el líder corrige los datos de una actividad
 * después de tomarla, el corte sigue reflejando lo que se sabía en su fecha; para rectificar hay
 * que borrar el corte y volver a tomarlo.
 *
 * @param id          identificador asignado por la persistencia, nulo antes de guardar
 * @param projectId   proyecto al que pertenece
 * @param cutoffDate  fecha a la que se refieren las cifras
 * @param notes       comentario opcional del líder sobre el corte
 * @param totals      cifras consolidadas del proyecto en esa fecha
 * @param activities  cifras de cada actividad en esa fecha
 * @param createdAt   momento en que se registró, nulo antes de guardar
 */
public record ProjectMeasurement(
        Long id,
        Long projectId,
        LocalDate cutoffDate,
        String notes,
        EvmTotals totals,
        List<ActivityMeasurement> activities,
        Instant createdAt) {

    public static final int NOTES_MAX_LENGTH = 500;

    public ProjectMeasurement {
        if (projectId == null) {
            throw new InvalidMeasurementException("La medición debe pertenecer a un proyecto");
        }
        if (cutoffDate == null) {
            throw new InvalidMeasurementException("La fecha de corte es obligatoria");
        }
        if (notes != null && notes.length() > NOTES_MAX_LENGTH) {
            throw new InvalidMeasurementException(
                    "El comentario no puede superar " + NOTES_MAX_LENGTH + " caracteres");
        }
        if (totals == null) {
            throw new InvalidMeasurementException("Las cifras de la medición son obligatorias");
        }
        activities = activities == null ? List.of() : List.copyOf(activities);
    }
}
