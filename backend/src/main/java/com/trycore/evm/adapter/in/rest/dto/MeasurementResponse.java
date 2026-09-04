package com.trycore.evm.adapter.in.rest.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Un corte del histórico en las respuestas del API.
 *
 * <p>Devuelve cifras, no indicadores: los índices no se almacenan y se calculan al leer. La serie
 * temporal de {@code /timeline} es la que los entrega ya resueltos para graficar.
 */
public record MeasurementResponse(

        @Schema(description = "Identificador de la medición", example = "1")
        Long id,

        @Schema(description = "Identificador del proyecto al que pertenece", example = "1")
        Long projectId,

        @Schema(description = "Fecha a la que se refieren las cifras del corte", example = "2026-08-31")
        LocalDate cutoffDate,

        @Schema(description = "Comentario del líder sobre el corte", example = "Cierre de la semana 1")
        String notes,

        @Schema(description = "Cifras consolidadas del proyecto en esa fecha")
        EvmTotalsResponse totals,

        @Schema(description = "Cifras de cada actividad en esa fecha")
        List<ActivityMeasurementResponse> activities,

        @Schema(description = "Momento en que se registró el corte", example = "2026-08-31T21:00:00Z")
        Instant createdAt) {
}
