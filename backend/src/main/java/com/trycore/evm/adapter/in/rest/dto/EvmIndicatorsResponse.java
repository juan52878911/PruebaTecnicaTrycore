package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Indicadores de Valor Ganado de una actividad o de un proyecto consolidado, en las respuestas del API.
 *
 * <p>Un indicador nulo significa que no se puede calcular, nunca que valga cero. Cuando el índice
 * nulo es el CPI o el SPI, su interpretación lo acompaña con estado {@code NOT_APPLICABLE} y el
 * motivo. El EAC y el VAC son el único caso en que un valor nulo no lleva estado propio: se derivan
 * del CPI y quedan indefinidos tanto si el CPI no existe (AC = 0) como si vale cero (avance real 0
 * con costo incurrido), y en ese segundo caso el estado de costo describe el CPI, que sí existe.
 */
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
                description = "Estimación a la conclusión (EAC = BAC / CPI); nulo cuando el CPI es nulo o "
                        + "vale cero, es decir cuando no hay costo real o no hay avance real que valorar",
                example = "150000.00")
        BigDecimal estimateAtCompletion,

        @Schema(
                description = "Variación a la conclusión (VAC = BAC - EAC); nulo siempre que el EAC lo sea",
                example = "-50000.00")
        BigDecimal varianceAtCompletion,

        @Schema(description = "Interpretación del índice de desempeño de costo (CPI)")
        IndexInterpretationResponse costStatus,

        @Schema(description = "Interpretación del índice de desempeño de cronograma (SPI)")
        IndexInterpretationResponse scheduleStatus,

        @Schema(
                description = "Fórmula con la que se calcularon los campos de EAC y VAC de este nivel",
                example = "BAC_OVER_CPI")
        String estimateFormula,

        @Schema(description = "Las tres estimaciones estándar del costo final sobre estas mismas cifras")
        List<CompletionEstimateResponse> estimates,

        @Schema(description = "Umbrales con los que se clasificó la severidad de las desviaciones")
        PerformanceThresholdsResponse thresholds) {
}
