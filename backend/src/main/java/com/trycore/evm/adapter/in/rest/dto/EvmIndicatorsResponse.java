package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

/** Indicadores de Valor Ganado de una actividad o de un proyecto consolidado, en las respuestas del API. */
public record EvmIndicatorsResponse(

        @Schema(description = "Valor planificado (PV = porcentaje planificado x BAC)", example = "50000.00")
        BigDecimal plannedValue,

        @Schema(description = "Valor ganado (EV = porcentaje real x BAC)", example = "40000.00")
        BigDecimal earnedValue,

        @Schema(description = "Costo real incurrido (AC)", example = "60000.00")
        BigDecimal actualCost,

        @Schema(description = "Variación de costo (CV = EV - AC)", example = "-20000.00")
        BigDecimal costVariance,

        @Schema(description = "Variación de cronograma (SV = EV - PV)", example = "-10000.00")
        BigDecimal scheduleVariance,

        @Schema(
                description = "Índice de desempeño de costo (CPI = EV / AC); nulo cuando AC es cero",
                example = "0.6667")
        BigDecimal costPerformanceIndex,

        @Schema(
                description = "Índice de desempeño de cronograma (SPI = EV / PV); nulo cuando PV es cero",
                example = "0.8000")
        BigDecimal schedulePerformanceIndex,

        @Schema(
                description = "Estimación a la conclusión (EAC = BAC / CPI); nulo cuando el CPI es nulo",
                example = "150000.00")
        BigDecimal estimateAtCompletion,

        @Schema(
                description = "Variación a la conclusión (VAC = BAC - EAC); nulo cuando el EAC es nulo",
                example = "-50000.00")
        BigDecimal varianceAtCompletion,

        @Schema(description = "Interpretación del índice de desempeño de costo (CPI)")
        IndexInterpretationResponse costStatus,

        @Schema(description = "Interpretación del índice de desempeño de cronograma (SPI)")
        IndexInterpretationResponse scheduleStatus) {
}
