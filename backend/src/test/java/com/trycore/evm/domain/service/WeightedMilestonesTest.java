package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.MeasurementMethod;
import com.trycore.evm.domain.model.Milestone;
import com.trycore.evm.domain.model.ProgressMeasurement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valor Ganado de una actividad medida por hitos ponderados.
 *
 * <p>Caso base: BAC 100.000, avance planificado 80 %, AC 75.000 y la tabla Diseño 20,
 * Construcción 50 y Pruebas 30. Lo que cambia entre pruebas es qué hitos están cumplidos.
 *
 * <p>El avance real no se declara: se deriva de los hitos y se materializa en las cifras de la
 * actividad. Por eso estas pruebas comprueban primero el porcentaje derivado y después los
 * indicadores, que ya son los mismos que produciría la regla de porcentaje completado con ese
 * porcentaje escrito a mano. Todos los valores esperados están derivados con las fórmulas del
 * estándar, no copiados de la salida del código.
 */
class WeightedMilestonesTest {

    private static final Long PROJECT_ID = 1L;
    private static final String ACTIVITY_NAME = "Obra civil";
    private static final String DESIGN = "Diseño";
    private static final String BUILD = "Construcción";
    private static final String TEST = "Pruebas";
    private static final String BUDGET = "100000";
    private static final String NO_BUDGET = "0";
    private static final String PLANNED_PERCENT = "80";
    private static final String ACTUAL_COST = "75000";
    private static final LocalDate ACHIEVED_ON = LocalDate.parse("2026-03-15");
    private static final int MILESTONE_COUNT = 3;

    private final EvmCalculator calculator = new EvmCalculator();

    private static Milestone milestone(final String name, final String weight, final boolean achieved) {
        return new Milestone(name, new BigDecimal(weight), achieved, achieved ? ACHIEVED_ON : null);
    }

    /** Tabla de referencia con los tres hitos y el estado de cumplimiento que se indique. */
    private static List<Milestone> referenceTable(
            final boolean designDone, final boolean buildDone, final boolean testDone) {
        return List.of(
                milestone(DESIGN, "20", designDone),
                milestone(BUILD, "50", buildDone),
                milestone(TEST, "30", testDone));
    }

    /**
     * Actividad del caso base. El avance real que se pasa es irrelevante y se escribe a cien para
     * demostrarlo: la actividad lo sustituye por el derivado de sus hitos.
     */
    private static Activity activityWith(final String budget, final List<Milestone> milestones) {
        final ActivityFigures declared = new ActivityFigures(
                new BigDecimal(budget),
                new BigDecimal(PLANNED_PERCENT),
                new BigDecimal("100"),
                new BigDecimal(ACTUAL_COST));
        return Activity.create(
                PROJECT_ID,
                ACTIVITY_NAME,
                declared,
                ActivitySchedule.empty(),
                ProgressMeasurement.weightedMilestones(milestones));
    }

    @Test
    void twoOfThreeMilestonesAchievedDeriveSeventyPercent() {
        final Activity activity = activityWith(BUDGET, referenceTable(true, true, false));

        final ActivityEvm evaluated = calculator.evaluate(activity);
        final EvmIndicators indicators = evaluated.indicators();

        // Derivado = 20 (Diseño) + 50 (Construcción) = 70,00
        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("70.00");
        // PV = 100.000 x 80 / 100 = 80.000
        assertThat(indicators.plannedValue()).isEqualByComparingTo("80000.00");
        // EV = 100.000 x 70 / 100 = 70.000
        assertThat(indicators.earnedValue()).isEqualByComparingTo("70000.00");
        // CV = EV - AC = 70.000 - 75.000 = -5.000
        assertThat(indicators.costVariance()).isEqualByComparingTo("-5000.00");
        // SV = EV - PV = 70.000 - 80.000 = -10.000
        assertThat(indicators.scheduleVariance()).isEqualByComparingTo("-10000.00");
        // CPI = EV / AC = 70.000 / 75.000 = 0,933333... -> 0,9333
        assertThat(indicators.costPerformanceIndex()).isEqualByComparingTo("0.9333");
        // SPI = EV / PV = 70.000 / 80.000 = 0,875 -> 0,8750
        assertThat(indicators.schedulePerformanceIndex()).isEqualByComparingTo("0.8750");
        // EAC = BAC x AC / EV = 100.000 x 75.000 / 70.000 = 107.142,857... -> 107.142,86
        assertThat(indicators.estimateAtCompletion()).isEqualByComparingTo("107142.86");
        // VAC = BAC - EAC = 100.000 - 107.142,86 = -7.142,86
        assertThat(indicators.varianceAtCompletion()).isEqualByComparingTo("-7142.86");
        // El porcentaje efectivo es el derivado: la regla de hitos no recorta lo que ya viene hecho.
        assertThat(evaluated.effectiveActualPercent()).isEqualByComparingTo("70.00");
    }

    @Test
    void noMilestoneAchievedDerivesZeroAndLeavesTheEstimateUndefined() {
        final Activity activity = activityWith(BUDGET, referenceTable(false, false, false));

        final EvmIndicators indicators = calculator.calculate(activity);

        // Derivado = ningún peso cumplido = 0,00
        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("0.00");
        // EV = 100.000 x 0 / 100 = 0
        assertThat(indicators.earnedValue()).isEqualByComparingTo("0.00");
        // CPI = EV / AC = 0 / 75.000 = 0,0000. Existe y vale cero: hay costo, no hay valor ganado.
        assertThat(indicators.costPerformanceIndex()).isEqualByComparingTo("0.0000");
        // EAC = BAC x AC / EV con EV = 0 es indefinido, y el VAC hereda esa indefinición.
        assertThat(indicators.estimateAtCompletion()).isNull();
        assertThat(indicators.varianceAtCompletion()).isNull();
    }

    @Test
    void allMilestonesAchievedDeriveOneHundredPercent() {
        final Activity activity = activityWith(BUDGET, referenceTable(true, true, true));

        final EvmIndicators indicators = calculator.calculate(activity);

        // Derivado = 20 + 50 + 30 = 100,00
        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("100.00");
        // EV = 100.000 x 100 / 100 = 100.000
        assertThat(indicators.earnedValue()).isEqualByComparingTo("100000.00");
        // CPI = EV / AC = 100.000 / 75.000 = 1,333333... -> 1,3333
        assertThat(indicators.costPerformanceIndex()).isEqualByComparingTo("1.3333");
        // SPI = EV / PV = 100.000 / 80.000 = 1,25 -> 1,2500
        assertThat(indicators.schedulePerformanceIndex()).isEqualByComparingTo("1.2500");
        // EAC = BAC x AC / EV = 100.000 x 75.000 / 100.000 = 75.000,00
        assertThat(indicators.estimateAtCompletion()).isEqualByComparingTo("75000.00");
        // VAC = BAC - EAC = 100.000 - 75.000 = 25.000,00
        assertThat(indicators.varianceAtCompletion()).isEqualByComparingTo("25000.00");
    }

    @Test
    void decimalWeightsAddUpWithoutLosingPrecision() {
        // 33,33 + 33,33 + 33,34 = 100,00 exacto. Con los dos primeros cumplidos el avance derivado
        // es 33,33 + 33,33 = 66,66, y no 66,67 ni 66,6: no hay redondeo por el camino.
        final Activity activity = activityWith(
                BUDGET,
                List.of(
                        milestone(DESIGN, "33.33", true),
                        milestone(BUILD, "33.33", true),
                        milestone(TEST, "33.34", false)));

        final EvmIndicators indicators = calculator.calculate(activity);

        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("66.66");
        // EV = 100.000 x 66,66 / 100 = 66.660,00
        assertThat(indicators.earnedValue()).isEqualByComparingTo("66660.00");
    }

    @Test
    void zeroBudgetEarnsNothingEvenWithEveryMilestoneAchieved() {
        // El avance no depende del presupuesto: se deriva igual. Lo que vale cero es el dinero.
        final Activity activity = activityWith(NO_BUDGET, referenceTable(true, true, true));

        final EvmIndicators indicators = calculator.calculate(activity);

        // Derivado = 20 + 50 + 30 = 100,00
        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("100.00");
        // EV = 0 x 100 / 100 = 0,00
        assertThat(indicators.earnedValue()).isEqualByComparingTo("0.00");
        // PV = 0 x 80 / 100 = 0,00
        assertThat(indicators.plannedValue()).isEqualByComparingTo("0.00");
    }

    @Test
    void updateReplacesTheWholeMilestoneTableAndRederivesProgress() {
        final Activity activity = activityWith(BUDGET, referenceTable(true, false, false));

        final Activity updated = activity.update(
                ACTIVITY_NAME,
                activity.figures(),
                activity.schedule(),
                ProgressMeasurement.weightedMilestones(referenceTable(true, true, false)));

        // Derivado tras el reemplazo = 20 + 50 = 70,00, frente al 20,00 anterior.
        assertThat(activity.figures().actualProgressPercent()).isEqualByComparingTo("20.00");
        assertThat(updated.figures().actualProgressPercent()).isEqualByComparingTo("70.00");
    }

    @Test
    void changingTheMethodKeepsTheMilestonesAndStopsDerivingProgress() {
        final Activity activity = activityWith(BUDGET, referenceTable(true, true, false));
        final ActivityFigures declaredFigures = new ActivityFigures(
                new BigDecimal(BUDGET),
                new BigDecimal(PLANNED_PERCENT),
                new BigDecimal("40"),
                new BigDecimal(ACTUAL_COST));

        final Activity updated = activity.update(
                ACTIVITY_NAME,
                declaredFigures,
                activity.schedule(),
                new ProgressMeasurement(MeasurementMethod.PERCENT_COMPLETE));

        assertThat(updated.progress().milestones()).hasSize(MILESTONE_COUNT);
        assertThat(updated.progress().derivedProgressPercent()).isEmpty();
        // Sin la regla de hitos manda el porcentaje declarado, no el derivado de 70,00.
        assertThat(updated.figures().actualProgressPercent()).isEqualByComparingTo("40");
    }
}
