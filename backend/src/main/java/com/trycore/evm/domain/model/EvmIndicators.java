package com.trycore.evm.domain.model;

import java.math.BigDecimal;

/**
 * Indicadores de Valor Ganado de una actividad o de un proyecto consolidado.
 *
 * <p>Los importes tienen escala 2 y los índices escala 4. Un índice cuyo divisor es cero no se
 * puede calcular: en ese caso el índice es nulo y su interpretación es NOT_APPLICABLE con el motivo.
 * EAC y VAC heredan la indefinición del CPI (CPI nulo o igual a cero).
 *
 * @param plannedValue             PV = porcentaje planificado x BAC
 * @param earnedValue              EV = porcentaje real x BAC
 * @param actualCost               AC, costo real incurrido
 * @param costVariance             CV = EV - AC
 * @param scheduleVariance         SV = EV - PV
 * @param costPerformanceIndex     CPI = EV / AC, nulo si AC = 0
 * @param schedulePerformanceIndex SPI = EV / PV, nulo si PV = 0
 * @param estimateAtCompletion     EAC = BAC / CPI, nulo si el CPI es nulo o cero
 * @param varianceAtCompletion     VAC = BAC - EAC, nulo si el EAC es nulo
 * @param costStatus               interpretación del CPI
 * @param scheduleStatus           interpretación del SPI
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
        IndexInterpretation costStatus,
        IndexInterpretation scheduleStatus) {
}
