package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivityMeasurement;
import com.trycore.evm.domain.model.CompletionEstimate;
import com.trycore.evm.domain.model.DeviationSeverity;
import com.trycore.evm.domain.model.EstimateFormula;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.IndexInterpretation;
import com.trycore.evm.domain.model.MeasurementMethod;
import com.trycore.evm.domain.model.MeasurementPoint;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.PerformanceThresholds;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;
import com.trycore.evm.domain.model.ProjectMeasurement;
import com.trycore.evm.domain.model.ProjectTimeline;

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
 *   <li>El EAC se calcula con la fórmula pedida, o con la de por defecto, y siempre desarrollando
 *       la expresión para no arrastrar el redondeo a cuatro decimales de los índices. Junto al
 *       titular se devuelven las tres fórmulas estándar, porque el rango entre ellas informa más
 *       que una sola cifra. Ver {@link EstimateFormula}.</li>
 *   <li>Cada actividad reconoce valor según su regla de medición, y la regla se aplica tanto al
 *       valor planificado como al ganado. Ver {@link MeasurementMethod}.</li>
 *   <li>El consolidado del proyecto suma BAC, PV, EV y AC y calcula los índices sobre las sumas.
 *       No se promedian los índices de las actividades.</li>
 *   <li>Cada índice viaja con su estado y con la severidad de su desviación. El estado es el hecho
 *       aritmético y la severidad la tolerancia admitida; los umbrales se reciben al construir el
 *       servicio y viajan en el resultado para que ningún cliente los repita por su cuenta.</li>
 * </ul>
 *
 * <p>Aviso sobre el SPI, conocido en el estándar: converge a 1 al cierre del proyecto aunque este
 * termine con retraso, porque cuando todo el trabajo está hecho EV y PV valen ambos BAC. Su
 * severidad es fiable en la primera mitad del proyecto y cada vez menos hacia el final. La
 * corrección ortodoxa es medir el cronograma en unidades de tiempo (Earned Schedule), que queda
 * fuera de este alcance y se nombra aquí para que la limitación esté dicha y no escondida.
 */
public final class EvmCalculator {

    static final String NO_ACTUAL_COST_REASON = "No aplica: no hay costo real registrado (AC = 0)";
    static final String NO_PLANNED_VALUE_REASON = "No aplica: no hay valor planificado (PV = 0)";

    private static final int MONEY_SCALE = 2;
    private static final int INDEX_SCALE = 4;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    private static final MathContext EXACT_DIVISION = MathContext.DECIMAL128;
    private static final BigDecimal PERCENT_DIVISOR = new BigDecimal("100");
    private static final EstimateFormula DEFAULT_FORMULA = EstimateFormula.BAC_OVER_CPI;

    private final PerformanceThresholds thresholds;

    /** Calculador con los umbrales de tolerancia por defecto del dominio. */
    public EvmCalculator() {
        this(PerformanceThresholds.defaults());
    }

    public EvmCalculator(final PerformanceThresholds thresholds) {
        this.thresholds = thresholds == null ? PerformanceThresholds.defaults() : thresholds;
    }

    /** Umbrales con los que este calculador clasifica la severidad de las desviaciones. */
    public PerformanceThresholds thresholds() {
        return thresholds;
    }

    /** Indicadores de una sola actividad a partir de sus cifras, con la fórmula de EAC por defecto. */
    public EvmIndicators calculate(final ActivityFigures figures) {
        return calculate(figures, DEFAULT_FORMULA);
    }

    /** Indicadores de una sola actividad a partir de sus cifras, con la fórmula de EAC indicada. */
    public EvmIndicators calculate(final ActivityFigures figures, final EstimateFormula formula) {
        return calculate(totalsOf(figures, MeasurementMethod.PERCENT_COMPLETE, false), formula);
    }

    /** Indicadores de una actividad, aplicando su propia regla de medición. */
    public EvmIndicators calculate(final Activity activity) {
        return calculate(activity, DEFAULT_FORMULA);
    }

    /** Indicadores de una actividad, con su regla de medición y la fórmula de EAC indicada. */
    public EvmIndicators calculate(final Activity activity, final EstimateFormula formula) {
        return calculate(
                totalsOf(activity.figures(), activity.progress().method(), activity.started()), formula);
    }

    /**
     * Cifras de una actividad tras aplicar su regla de medición a los dos lados.
     *
     * <p>La misma regla gobierna el valor planificado y el ganado. Al lado planificado no le consta
     * ninguna fecha real, así que su señal de "iniciada" es que el plan previera algún avance a la
     * fecha; al lado real le basta con haber arrancado.
     */
    private static EvmTotals totalsOf(
            final ActivityFigures figures, final MeasurementMethod method, final boolean started) {
        final BigDecimal plannedPercent = method.recognisedPercent(
                figures.plannedProgressPercent(), figures.plannedProgressPercent().signum() > 0);
        final BigDecimal earnedPercent = method.recognisedPercent(figures.actualProgressPercent(), started);
        return new EvmTotals(
                figures.budgetAtCompletion(),
                percentOf(plannedPercent, figures.budgetAtCompletion()),
                percentOf(earnedPercent, figures.budgetAtCompletion()),
                figures.actualCost());
    }

    /**
     * Indicadores derivados de unas cifras ya conocidas, sin pasar por porcentajes.
     *
     * <p>Es la puerta de entrada para el histórico: una medición guarda solo las cifras y sus
     * indicadores se calculan aquí al leerla, con las mismas reglas que el análisis en vivo.
     */
    public EvmIndicators calculate(final EvmTotals totals) {
        return calculate(totals, DEFAULT_FORMULA);
    }

    /**
     * Actividad con sus indicadores y con los porcentajes que su regla de medición reconoce.
     *
     * <p>Es la unidad que consume una vista de detalle: la misma que compone el consolidado, de
     * modo que una actividad vista suelta y vista dentro del proyecto dan exactamente lo mismo.
     */
    public ActivityEvm evaluate(final Activity activity) {
        return toActivityEvm(activity, DEFAULT_FORMULA);
    }

    /** Indicadores de cada actividad y consolidado del proyecto, con la fórmula de EAC por defecto. */
    public ProjectEvmSummary consolidate(final Project project, final List<Activity> activities) {
        return consolidate(project, activities, DEFAULT_FORMULA);
    }

    /** Indicadores de cada actividad y consolidado del proyecto sobre las sumas. */
    public ProjectEvmSummary consolidate(
            final Project project, final List<Activity> activities, final EstimateFormula formula) {
        final List<ActivityEvm> perActivity = activities.stream()
                .map(activity -> toActivityEvm(activity, formula))
                .toList();
        final BigDecimal totalBudget = sum(perActivity, item -> item.activity().figures().budgetAtCompletion());
        final BigDecimal totalPlannedValue = sum(perActivity, item -> item.indicators().plannedValue());
        final BigDecimal totalEarnedValue = sum(perActivity, item -> item.indicators().earnedValue());
        final BigDecimal totalActualCost = sum(perActivity, item -> item.indicators().actualCost());
        final EvmIndicators consolidated = calculate(
                new EvmTotals(totalBudget, totalPlannedValue, totalEarnedValue, totalActualCost), formula);
        return new ProjectEvmSummary(project, money(totalBudget), consolidated, perActivity);
    }

    /**
     * Congela el estado actual del proyecto en una fecha de corte.
     *
     * <p>Guarda las cifras, no los índices, y el nombre de cada actividad además de su
     * identificador: la medición es un registro histórico y debe seguir siendo legible aunque la
     * actividad se renombre o desaparezca después.
     */
    public ProjectMeasurement capture(
            final Project project,
            final List<Activity> activities,
            final LocalDate cutoffDate,
            final String notes) {
        final ProjectEvmSummary summary = consolidate(project, activities);
        final List<ActivityMeasurement> lines = summary.activities().stream()
                .map(item -> new ActivityMeasurement(
                        item.activity().id(),
                        item.activity().name(),
                        new EvmTotals(
                                item.activity().figures().budgetAtCompletion(),
                                item.indicators().plannedValue(),
                                item.indicators().earnedValue(),
                                item.indicators().actualCost())))
                .toList();
        return new ProjectMeasurement(
                null,
                project.id(),
                cutoffDate,
                notes,
                new EvmTotals(
                        summary.budgetAtCompletion(),
                        summary.indicators().plannedValue(),
                        summary.indicators().earnedValue(),
                        summary.indicators().actualCost()),
                lines,
                null);
    }

    /**
     * Serie temporal del proyecto, ordenada por fecha de corte de la más antigua a la más reciente.
     *
     * <p>Cada punto llega con sus indicadores ya calculados para que el cliente que dibuja la
     * gráfica no tenga que reimplementar ninguna fórmula. Dos cortes con la misma fecha no pueden
     * existir, así que el orden es estable.
     */
    public ProjectTimeline buildTimeline(final Project project, final List<ProjectMeasurement> measurements) {
        return buildTimeline(project, measurements, DEFAULT_FORMULA);
    }

    /**
     * Serie temporal con la fórmula de EAC indicada. Acepta el mismo parámetro que el análisis en
     * vivo a propósito: si cada pantalla usara una fórmula distinta, mostrarían estimaciones
     * diferentes para las mismas cifras y parecería un fallo.
     */
    public ProjectTimeline buildTimeline(
            final Project project,
            final List<ProjectMeasurement> measurements,
            final EstimateFormula formula) {
        final List<MeasurementPoint> points = measurements.stream()
                .sorted(Comparator.comparing(ProjectMeasurement::cutoffDate))
                .map(measurement -> new MeasurementPoint(
                        measurement.cutoffDate(),
                        measurement.notes(),
                        measurement.totals(),
                        calculate(measurement.totals(), formula)))
                .toList();
        return new ProjectTimeline(project, points);
    }

    /** Indicadores de unas cifras dadas, con la fórmula de EAC indicada. */
    public EvmIndicators calculate(final EvmTotals totals, final EstimateFormula formula) {
        final EstimateFormula selected = formula == null ? DEFAULT_FORMULA : formula;
        final BigDecimal plannedValue = totals.plannedValue();
        final BigDecimal earnedValue = totals.earnedValue();
        final BigDecimal actualCost = totals.actualCost();
        final BigDecimal costPerformanceIndex = index(earnedValue, actualCost);
        final BigDecimal schedulePerformanceIndex = index(earnedValue, plannedValue);
        final List<CompletionEstimate> estimates = Arrays.stream(EstimateFormula.values())
                .map(candidate -> CompletionEstimate.of(candidate, totals))
                .toList();
        final CompletionEstimate headline = estimates.stream()
                .filter(estimate -> estimate.formula() == selected)
                .findFirst()
                .orElseThrow();
        return new EvmIndicators(
                money(plannedValue),
                money(earnedValue),
                money(actualCost),
                money(earnedValue.subtract(actualCost)),
                money(earnedValue.subtract(plannedValue)),
                costPerformanceIndex,
                schedulePerformanceIndex,
                headline.estimateAtCompletion(),
                headline.varianceAtCompletion(),
                selected,
                estimates,
                interpretCost(costPerformanceIndex),
                interpretSchedule(schedulePerformanceIndex),
                thresholds);
    }

    private ActivityEvm toActivityEvm(final Activity activity, final EstimateFormula formula) {
        final MeasurementMethod method = activity.progress().method();
        final ActivityFigures figures = activity.figures();
        return new ActivityEvm(
                activity,
                calculate(activity, formula),
                method.recognisedPercent(
                        figures.plannedProgressPercent(), figures.plannedProgressPercent().signum() > 0),
                method.recognisedPercent(figures.actualProgressPercent(), activity.started()));
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

    private IndexInterpretation interpretCost(final BigDecimal costPerformanceIndex) {
        if (costPerformanceIndex == null) {
            return IndexInterpretation.notApplicable(NO_ACTUAL_COST_REASON);
        }
        return IndexInterpretation.of(
                statusFor(
                        costPerformanceIndex,
                        PerformanceStatus.UNDER_BUDGET,
                        PerformanceStatus.ON_BUDGET,
                        PerformanceStatus.OVER_BUDGET),
                severityOf(costPerformanceIndex));
    }

    private IndexInterpretation interpretSchedule(final BigDecimal schedulePerformanceIndex) {
        if (schedulePerformanceIndex == null) {
            return IndexInterpretation.notApplicable(NO_PLANNED_VALUE_REASON);
        }
        return IndexInterpretation.of(
                statusFor(
                        schedulePerformanceIndex,
                        PerformanceStatus.AHEAD_OF_SCHEDULE,
                        PerformanceStatus.ON_SCHEDULE,
                        PerformanceStatus.BEHIND_SCHEDULE),
                severityOf(schedulePerformanceIndex));
    }

    private DeviationSeverity severityOf(final BigDecimal indexValue) {
        return thresholds.severityOf(indexValue);
    }

    /**
     * Mayor que 1 favorable, igual a 1 en objetivo, menor que 1 desfavorable.
     *
     * <p>La comparación se hace sobre el índice ya redondeado a la escala de índice, así que la
     * igualdad "exacta" es en realidad una banda de anchura 0,0001. Es una consecuencia declarada
     * del redondeo, no un descuido: la banda con sentido de negocio es la severidad.
     */
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
