package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** Análisis de Valor Ganado consolidado de un proyecto, en las respuestas del API. */
public record ProjectEvmSummaryResponse(

        @Schema(description = "Proyecto analizado")
        ProjectResponse project,

        @Schema(description = "Presupuesto total del proyecto (suma del BAC de sus actividades)",
                example = "430000.00")
        BigDecimal budgetAtCompletion,

        @Schema(description = "Indicadores consolidados, calculados sobre las sumas del proyecto")
        EvmIndicatorsResponse indicators,

        @Schema(description = "Actividades del proyecto, cada una con sus propios indicadores")
        List<ActivityResponse> activities) {
}
