package com.trycore.evm.adapter.in.rest.dto;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/** Un punto de la serie temporal: una fecha de corte con sus cifras y sus indicadores calculados. */
public record MeasurementPointResponse(

        @Schema(description = "Fecha del corte", example = "2026-08-31")
        LocalDate cutoffDate,

        @Schema(description = "Comentario del corte, útil para anotar la gráfica",
                example = "Cierre de la semana 1")
        String notes,

        @Schema(description = "Cifras base del proyecto en esa fecha")
        EvmTotalsResponse totals,

        @Schema(description = "Indicadores derivados de esas cifras, con su interpretación")
        EvmIndicatorsResponse indicators) {
}
