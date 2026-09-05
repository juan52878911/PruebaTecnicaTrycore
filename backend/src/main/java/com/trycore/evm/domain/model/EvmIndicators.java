package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.util.List;

/**
 * Indicadores de Valor Ganado de una actividad o de un proyecto consolidado.
 *
 * <p>Un indicador nulo significa que no se puede calcular, nunca que valga cero. Cuando el índice
 * nulo es el CPI o el SPI, su interpretación lo acompaña con estado {@code NOT_APPLICABLE}, la
 * severidad equivalente y el motivo. El EAC y el VAC son el único caso en que un valor nulo no
 * lleva estado propio: se derivan del CPI y quedan indefinidos tanto si el CPI no existe (AC = 0)
 * como si vale cero (avance real 0 con costo incurrido), y en ese segundo caso el estado de costo
 * describe el CPI, que sí existe.
 *
 * <p>{@code estimateAtCompletion} y {@code varianceAtCompletion} son los de la fórmula titular,
 * la que se pidió o la de por defecto. {@code estimates} trae además las tres fórmulas estándar
 * calculadas sobre las mismas cifras, para poder leer el rango en vez de un único escenario.
 *
 * @param plannedValue             PV = fracción planificada x BAC
 * @param earnedValue              EV = fracción ganada x BAC
 * @param actualCost               AC, costo real incurrido
 * @param costVariance             CV = EV - AC
 * @param scheduleVariance         SV = EV - PV
 * @param costPerformanceIndex     CPI = EV / AC, nulo si AC = 0
 * @param schedulePerformanceIndex SPI = EV / PV, nulo si PV = 0
 * @param estimateAtCompletion     EAC de la fórmula titular, nulo si esa fórmula no aplica
 * @param varianceAtCompletion     VAC = BAC - EAC de la fórmula titular, nulo si el EAC lo es
 * @param estimateFormula          fórmula titular empleada
 * @param estimates                las tres fórmulas estándar sobre estas mismas cifras
 * @param costStatus               interpretación del CPI
 * @param scheduleStatus           interpretación del SPI
 * @param thresholds               umbrales con los que se midió la severidad
 */
public record EvmIndicators(
        BigDecimal plannedValue,
        BigDecimal earnedValue,
        BigDecimal actualCost,
        BigDecimal costVariance,
        BigDecimal scheduleVariance,
        BigDecimal costPerformanceIndex,
        BigDecimal schedulePerformanceIndex,
        BigDecimal estimateAtCompletion,
        BigDecimal varianceAtCompletion,
        EstimateFormula estimateFormula,
        List<CompletionEstimate> estimates,
        IndexInterpretation costStatus,
        IndexInterpretation scheduleStatus,
        PerformanceThresholds thresholds) {

    public EvmIndicators {
        estimates = estimates == null ? List.of() : List.copyOf(estimates);
    }
}
