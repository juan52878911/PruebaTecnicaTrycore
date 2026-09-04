package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;
import java.util.function.Function;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.IndexInterpretation;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;

/**
 * Cálculo de los indicadores de Valor Ganado (EVM), por actividad y consolidado por proyecto.
 *
 * <p>Servicio de dominio puro: sin estado, sin dependencias de infraestructura. Todas las
 * operaciones usan {@link BigDecimal}; los importes se redondean a escala 2 y los índices a
 * escala 4 con {@link RoundingMode#HALF_UP}.
 *
 * <p>Decisiones de cálculo:
 * <ul>
 *   <li>Un índice con divisor cero (CPI con AC = 0, SPI con PV = 0) es nulo y se interpreta como
 *       NOT_APPLICABLE con su motivo. Nunca se devuelve 0 ni se lanza una excepción.</li>
 *   <li>EAC = BAC / CPI se calcula como BAC x AC / EV con precisión completa y se redondea al
 *       final, para no arrastrar el redondeo a cuatro decimales del CPI. Con EV = 0 el CPI es 0 y
 *       el EAC queda indefinido (nulo); con AC = 0 hereda la indefinición del CPI.</li>
 *   <li>El consolidado del proyecto suma BAC, PV, EV y AC y calcula los índices sobre las sumas.
 *       No se promedian los índices de las actividades.</li>
 * </ul>
 */
public final class EvmCalculator {

    static final String NO_ACTUAL_COST_REASON = "No aplica: no hay costo real registrado (AC = 0)";
    static final String NO_PLANNED_VALUE_REASON = "No aplica: no hay valor planificado (PV = 0)";

    private static final int MONEY_SCALE = 2;
    private static final int INDEX_SCALE = 4;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final MathContext EXACT_DIVISION = MathContext.DECIMAL128;
    private static final BigDecimal PERCENT_DIVISOR = new BigDecimal("100");

    /** Indicadores de una sola actividad a partir de sus cifras. */
    public EvmIndicators calculate(final ActivityFigures figures) {
        final BigDecimal plannedValue = percentOf(figures.plannedProgressPercent(), figures.budgetAtCompletion());
        final BigDecimal earnedValue = percentOf(figures.actualProgressPercent(), figures.budgetAtCompletion());
        return calculate(figures.budgetAtCompletion(), plannedValue, earnedValue, figures.actualCost());
    }

    /** Indicadores de cada actividad y consolidado del proyecto sobre las sumas. */
    public ProjectEvmSummary consolidate(final Project project, final List<Activity> activities) {
        final List<ActivityEvm> perActivity = activities.stream()
                .map(activity -> new ActivityEvm(activity, calculate(activity.figures())))
                .toList();
        final BigDecimal totalBudget = sum(perActivity, item -> item.activity().figures().budgetAtCompletion());
        final BigDecimal totalPlannedValue = sum(perActivity, item -> item.indicators().plannedValue());
        final BigDecimal totalEarnedValue = sum(perActivity, item -> item.indicators().earnedValue());
        final BigDecimal totalActualCost = sum(perActivity, item -> item.indicators().actualCost());
        final EvmIndicators consolidated =
                calculate(totalBudget, totalPlannedValue, totalEarnedValue, totalActualCost);
        return new ProjectEvmSummary(project, money(totalBudget), consolidated, perActivity);
    }

    private EvmIndicators calculate(
            final BigDecimal budgetAtCompletion,
            final BigDecimal plannedValue,
            final BigDecimal earnedValue,
            final BigDecimal actualCost) {
        final BigDecimal costPerformanceIndex = index(earnedValue, actualCost);
        final BigDecimal schedulePerformanceIndex = index(earnedValue, plannedValue);
        final BigDecimal estimateAtCompletion = estimateAtCompletion(budgetAtCompletion, earnedValue, actualCost);
        final BigDecimal varianceAtCompletion =
                estimateAtCompletion == null ? null : money(budgetAtCompletion.subtract(estimateAtCompletion));
        return new EvmIndicators(
                money(plannedValue),
                money(earnedValue),
                money(actualCost),
                money(earnedValue.subtract(actualCost)),
                money(earnedValue.subtract(plannedValue)),
                costPerformanceIndex,
                schedulePerformanceIndex,
                estimateAtCompletion,
                varianceAtCompletion,
                interpretCost(costPerformanceIndex),
                interpretSchedule(schedulePerformanceIndex));
    }

    private static BigDecimal percentOf(final BigDecimal percent, final BigDecimal amount) {
        return amount.multiply(percent).divide(PERCENT_DIVISOR, EXACT_DIVISION);
    }

    /** Cociente con escala de índice, o nulo cuando el divisor es cero. */
    private static BigDecimal index(final BigDecimal dividend, final BigDecimal divisor) {
        if (isZero(divisor)) {
            return null;
        }
        return dividend.divide(divisor, INDEX_SCALE, ROUNDING);
    }

    /** EAC = BAC / CPI = BAC x AC / EV, sin redondeo intermedio; nulo si AC = 0 o EV = 0. */
    private static BigDecimal estimateAtCompletion(
            final BigDecimal budgetAtCompletion,
            final BigDecimal earnedValue,
            final BigDecimal actualCost) {
        if (isZero(actualCost) || isZero(earnedValue)) {
            return null;
        }
        return money(budgetAtCompletion.multiply(actualCost).divide(earnedValue, EXACT_DIVISION));
    }

    private static IndexInterpretation interpretCost(final BigDecimal costPerformanceIndex) {
        if (costPerformanceIndex == null) {
            return IndexInterpretation.notApplicable(NO_ACTUAL_COST_REASON);
        }
        return IndexInterpretation.of(statusFor(
                costPerformanceIndex,
                PerformanceStatus.UNDER_BUDGET,
                PerformanceStatus.ON_BUDGET,
                PerformanceStatus.OVER_BUDGET));
    }

    private static IndexInterpretation interpretSchedule(final BigDecimal schedulePerformanceIndex) {
        if (schedulePerformanceIndex == null) {
            return IndexInterpretation.notApplicable(NO_PLANNED_VALUE_REASON);
        }
        return IndexInterpretation.of(statusFor(
                schedulePerformanceIndex,
                PerformanceStatus.AHEAD_OF_SCHEDULE,
                PerformanceStatus.ON_SCHEDULE,
                PerformanceStatus.BEHIND_SCHEDULE));
    }

    /** Mayor que 1 favorable, igual a 1 en objetivo, menor que 1 desfavorable. */
    private static PerformanceStatus statusFor(
            final BigDecimal indexValue,
            final PerformanceStatus favorable,
            final PerformanceStatus onTarget,
            final PerformanceStatus unfavorable) {
        final int comparison = indexValue.compareTo(BigDecimal.ONE);
        if (comparison > 0) {
            return favorable;
        }
        if (comparison < 0) {
            return unfavorable;
        }
        return onTarget;
    }

    private static BigDecimal sum(final List<ActivityEvm> items, final Function<ActivityEvm, BigDecimal> amount) {
        return items.stream().map(amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(final BigDecimal value) {
        return value.setScale(MONEY_SCALE, ROUNDING);
    }

    private static boolean isZero(final BigDecimal value) {
        return value.signum() == 0;
    }
}
