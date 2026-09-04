package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

import com.trycore.evm.domain.exception.InvalidActivityException;

/**
 * Datos de entrada de una actividad para el cálculo de Valor Ganado.
 *
 * <p>Los porcentajes se expresan en escala 0-100. Las invariantes se validan aquí, en el dominio,
 * para que ningún adaptador pueda construir cifras inconsistentes.
 *
 * @param budgetAtCompletion     presupuesto total planificado (BAC), mayor o igual que cero
 * @param plannedProgressPercent porcentaje de avance planificado a la fecha de corte, entre 0 y 100
 * @param actualProgressPercent  porcentaje de avance real completado, entre 0 y 100
 * @param actualCost             costo real incurrido hasta la fecha (AC), mayor o igual que cero
 */
public record ActivityFigures(
        BigDecimal budgetAtCompletion,
        BigDecimal plannedProgressPercent,
        BigDecimal actualProgressPercent,
        BigDecimal actualCost) {

    public static final BigDecimal MIN_PERCENT = BigDecimal.ZERO;
    public static final BigDecimal MAX_PERCENT = new BigDecimal("100");

    public ActivityFigures {
        requireNonNegative(budgetAtCompletion, "El presupuesto total planificado (BAC)");
        requirePercent(plannedProgressPercent, "El porcentaje de avance planificado");
        requirePercent(actualProgressPercent, "El porcentaje de avance real");
        requireNonNegative(actualCost, "El costo real (AC)");
    }

    private static void requireNonNegative(final BigDecimal value, final String fieldLabel) {
        if (Objects.isNull(value)) {
            throw new InvalidActivityException(fieldLabel + " es obligatorio");
        }
        if (value.signum() < 0) {
            throw new InvalidActivityException(fieldLabel + " no puede ser negativo");
        }
    }

    private static void requirePercent(final BigDecimal value, final String fieldLabel) {
        if (Objects.isNull(value)) {
            throw new InvalidActivityException(fieldLabel + " es obligatorio");
        }
        if (value.compareTo(MIN_PERCENT) < 0 || value.compareTo(MAX_PERCENT) > 0) {
            throw new InvalidActivityException(fieldLabel + " debe estar entre 0 y 100");
        }
    }
}
