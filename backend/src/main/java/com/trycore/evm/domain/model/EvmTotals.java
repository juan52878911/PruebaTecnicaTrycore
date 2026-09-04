package com.trycore.evm.domain.model;

import java.math.BigDecimal;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Las cuatro cifras base del Valor Ganado, en dinero: presupuesto, valor planificado, valor ganado
 * y costo real. De ellas se derivan todos los indicadores.
 *
 * <p>Es lo único que se guarda de una medición histórica. Los índices no se almacenan: se calculan
 * al leer, con el mismo servicio que usa el resto del sistema. Así el histórico no puede
 * desincronizarse del cálculo vigente, y una corrección en las fórmulas se refleja también en las
 * mediciones ya tomadas.
 *
 * @param budgetAtCompletion presupuesto total planificado (BAC)
 * @param plannedValue       valor planificado a la fecha (PV)
 * @param earnedValue        valor ganado a la fecha (EV)
 * @param actualCost         costo real incurrido a la fecha (AC)
 */
public record EvmTotals(
        BigDecimal budgetAtCompletion,
        BigDecimal plannedValue,
        BigDecimal earnedValue,
        BigDecimal actualCost) {

    public EvmTotals {
        requireNonNegative(budgetAtCompletion, "El presupuesto total planificado (BAC)");
        requireNonNegative(plannedValue, "El valor planificado (PV)");
        requireNonNegative(earnedValue, "El valor ganado (EV)");
        requireNonNegative(actualCost, "El costo real (AC)");
    }

    private static void requireNonNegative(final BigDecimal value, final String fieldLabel) {
        if (value == null) {
            throw new InvalidActivityException(fieldLabel + " es obligatorio");
        }
        if (value.signum() < 0) {
            throw new InvalidActivityException(fieldLabel + " no puede ser negativo");
        }
    }
}
