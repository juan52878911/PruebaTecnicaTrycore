package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

/** Representación de una actividad, con sus indicadores de Valor Ganado, en las respuestas del API. */
public record ActivityResponse(

        @Schema(description = "Identificador de la actividad", example = "10")
        Long id,

        @Schema(description = "Identificador del proyecto al que pertenece", example = "1")
        Long projectId,

        @Schema(description = "Nombre de la actividad", example = "Diseño de arquitectura")
        String name,

        @Schema(description = "Presupuesto total planificado (BAC)", example = "100000.00")
        BigDecimal budgetAtCompletion,

        @Schema(description = "Porcentaje de avance planificado a la fecha de corte", example = "50.00")
        BigDecimal plannedProgressPercent,

        @Schema(description = "Porcentaje de avance real completado", example = "40.00")
        BigDecimal actualProgressPercent,

        @Schema(description = "Costo real incurrido (AC)", example = "60000.00")
        BigDecimal actualCost,

        @Schema(description = "Indicadores de Valor Ganado calculados a partir de las cifras de la actividad")
        EvmIndicatorsResponse indicators) {
}
