package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cada valor esperado está calculado a mano a partir de la fórmula, nunca copiado de la salida del
 * código. Los importes se comparan con escala 2 y los índices con escala 4.
 */
class EvmCalculatorTest {

    private static final Long PROJECT_ID = 1L;

    private final EvmCalculator calculator = new EvmCalculator();

    private static ActivityFigures figures(
            final String budget, final String planned, final String actual, final String cost) {
        return new ActivityFigures(
                new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost));
    }

    private static Activity activity(final Long id, final String name, final ActivityFigures figures) {
        return new Activity(id, PROJECT_ID, name, figures, ActivitySchedule.empty(), null, null);
    }

    @Nested
    @DisplayName("Indicadores de una actividad")
    class SingleActivity {

        @Test
        @DisplayName("caso canónico: BAC 100.000, planificado 50 %, real 40 %, AC 60.000")
        void canonicalOverBudgetAndBehindSchedule() {
            // PV = 0,50 x 100.000 = 50.000; EV = 0,40 x 100.000 = 40.000
            // CV = 40.000 - 60.000 = -20.000; SV = 40.000 - 50.000 = -10.000
            // CPI = 40.000 / 60.000 = 0,6667; SPI = 40.000 / 50.000 = 0,8000
            // EAC = BAC / CPI = 100.000 x 60.000 / 40.000 = 150.000; VAC = 100.000 - 150.000 = -50.000
            final EvmIndicators result = calculator.calculate(figures("100000", "50", "40", "60000"));

            assertThat(result.plannedValue()).isEqualByComparingTo("50000.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("40000.00");
            assertThat(result.actualCost()).isEqualByComparingTo("60000.00");
            assertThat(result.costVariance()).isEqualByComparingTo("-20000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("-10000.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("0.6667"));
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("0.8000"));
            assertThat(result.estimateAtCompletion()).isEqualTo(new BigDecimal("150000.00"));
            assertThat(result.varianceAtCompletion()).isEqualTo(new BigDecimal("-50000.00"));
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.BEHIND_SCHEDULE);
        }

        @Test
        @DisplayName("favorable: BAC 200.000, planificado 30 %, real 45 %, AC 60.000")
        void underBudgetAndAheadOfSchedule() {
            // PV = 60.000; EV = 90.000; CV = 30.000; SV = 30.000
            // CPI = 90.000 / 60.000 = 1,5000; SPI = 90.000 / 60.000 = 1,5000
            // EAC = 200.000 x 60.000 / 90.000 = 133.333,33; VAC = 66.666,67
            final EvmIndicators result = calculator.calculate(figures("200000", "30", "45", "60000"));

            assertThat(result.plannedValue()).isEqualByComparingTo("60000.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("90000.00");
            assertThat(result.costVariance()).isEqualByComparingTo("30000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("30000.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("1.5000"));
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("1.5000"));
            assertThat(result.estimateAtCompletion()).isEqualTo(new BigDecimal("133333.33"));
            assertThat(result.varianceAtCompletion()).isEqualTo(new BigDecimal("66666.67"));
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.UNDER_BUDGET);
            assertThat(result.costStatus().message()).isEqualTo(PerformanceStatus.UNDER_BUDGET.description());
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.AHEAD_OF_SCHEDULE);
        }

        @Test
        @DisplayName("en objetivo: índices exactamente 1")
        void onBudgetAndOnSchedule() {
            // BAC 1.000, planificado 50 %, real 50 %, AC 500: PV = EV = AC = 500
            // CPI = SPI = 1,0000; EAC = 1.000 x 500 / 500 = 1.000; VAC = 0
            final EvmIndicators result = calculator.calculate(figures("1000", "50", "50", "500"));

            assertThat(result.costVariance()).isEqualByComparingTo("0.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("0.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("1.0000"));
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("1.0000"));
            assertThat(result.estimateAtCompletion()).isEqualTo(new BigDecimal("1000.00"));
            assertThat(result.varianceAtCompletion()).isEqualTo(new BigDecimal("0.00"));
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.ON_BUDGET);
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.ON_SCHEDULE);
        }

        @Test
        @DisplayName("redondeo HALF_UP: importes a 2 decimales e índices a 4")
        void roundsMoneyToTwoDecimalsAndIndexesToFour() {
            // BAC 1.000, planificado 33,33 %, real 66,67 %, AC 1.000
            // PV = 333,30; EV = 666,70; CPI = 666,70 / 1.000 = 0,6667
            // SPI = 666,70 / 333,30 = 2,00030003... -> 2,0003
            // EAC = 1.000 x 1.000 / 666,70 = 1.499,925... -> 1.499,93; VAC = -499,93
            final EvmIndicators result = calculator.calculate(figures("1000", "33.33", "66.67", "1000"));

            assertThat(result.plannedValue()).isEqualTo(new BigDecimal("333.30"));
            assertThat(result.earnedValue()).isEqualTo(new BigDecimal("666.70"));
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("0.6667"));
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("2.0003"));
            assertThat(result.estimateAtCompletion()).isEqualTo(new BigDecimal("1499.93"));
            assertThat(result.varianceAtCompletion()).isEqualTo(new BigDecimal("-499.93"));
        }
    }

    @Nested
    @DisplayName("Casos borde")
    class EdgeCases {

        @Test
        @DisplayName("AC = 0: el CPI no aplica y EAC y VAC heredan la indefinición")
        void actualCostZeroMakesCostIndexNotApplicable() {
            // BAC 80.000, planificado 25 %, real 0 %, AC 0 (tercera actividad del seed)
            // PV = 20.000; EV = 0; CV = 0; SV = -20.000; CPI = 0 / 0 -> no aplica
            // SPI = 0 / 20.000 = 0,0000 -> atrasado; EAC y VAC nulos
            final EvmIndicators result = calculator.calculate(figures("80000", "25", "0", "0"));

            assertThat(result.plannedValue()).isEqualByComparingTo("20000.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
            assertThat(result.costVariance()).isEqualByComparingTo("0.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("-20000.00");
            assertThat(result.costPerformanceIndex()).isNull();
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(result.costStatus().message()).isEqualTo(EvmCalculator.NO_ACTUAL_COST_REASON);
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("0.0000"));
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.BEHIND_SCHEDULE);
            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(result.varianceAtCompletion()).isNull();
        }

        @Test
        @DisplayName("AC = 0 con avance real: el CPI sigue sin aplicar aunque haya EV")
        void actualCostZeroWithProgressStillNotApplicable() {
            // BAC 10.000, planificado 20 %, real 30 %, AC 0: EV = 3.000 pero no hay divisor
            final EvmIndicators result = calculator.calculate(figures("10000", "20", "30", "0"));

            assertThat(result.earnedValue()).isEqualByComparingTo("3000.00");
            assertThat(result.costPerformanceIndex()).isNull();
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("1.5000"));
        }

        @Test
        @DisplayName("PV = 0: el SPI no aplica pero el CPI sí")
        void plannedValueZeroMakesScheduleIndexNotApplicable() {
            // BAC 50.000, planificado 0 %, real 10 %, AC 4.000
            // PV = 0; EV = 5.000; CV = 1.000; SV = 5.000; CPI = 5.000 / 4.000 = 1,2500
            // SPI = 5.000 / 0 -> no aplica; EAC = 50.000 x 4.000 / 5.000 = 40.000; VAC = 10.000
            final EvmIndicators result = calculator.calculate(figures("50000", "0", "10", "4000"));

            assertThat(result.plannedValue()).isEqualByComparingTo("0.00");
            assertThat(result.costVariance()).isEqualByComparingTo("1000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("5000.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("1.2500"));
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.UNDER_BUDGET);
            assertThat(result.schedulePerformanceIndex()).isNull();
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(result.scheduleStatus().message()).isEqualTo(EvmCalculator.NO_PLANNED_VALUE_REASON);
            assertThat(result.estimateAtCompletion()).isEqualTo(new BigDecimal("40000.00"));
            assertThat(result.varianceAtCompletion()).isEqualTo(new BigDecimal("10000.00"));
        }

        @Test
        @DisplayName("avance real 0 con costo: CPI 0 sobre presupuesto y EAC indefinido")
        void actualProgressZeroWithCostGivesZeroIndexes() {
            // BAC 80.000, planificado 25 %, real 0 %, AC 5.000
            // EV = 0; CV = -5.000; SV = -20.000; CPI = 0 / 5.000 = 0,0000; SPI = 0 / 20.000 = 0,0000
            // EAC = BAC / 0 -> indefinido; VAC indefinido
            final EvmIndicators result = calculator.calculate(figures("80000", "25", "0", "5000"));

            assertThat(result.costVariance()).isEqualByComparingTo("-5000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("-20000.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("0.0000"));
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
            assertThat(result.schedulePerformanceIndex()).isEqualTo(new BigDecimal("0.0000"));
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.BEHIND_SCHEDULE);
            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(result.varianceAtCompletion()).isNull();
        }

        @Test
        @DisplayName("BAC = 0 con costo: todo vale cero salvo la variación de costo")
        void budgetZeroWithCost() {
            // BAC 0, planificado 50 %, real 50 %, AC 100: PV = EV = 0; CV = -100; SV = 0
            // CPI = 0 / 100 = 0,0000; SPI = 0 / 0 -> no aplica; EAC indefinido
            final EvmIndicators result = calculator.calculate(figures("0", "50", "50", "100"));

            assertThat(result.plannedValue()).isEqualByComparingTo("0.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
            assertThat(result.costVariance()).isEqualByComparingTo("-100.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("0.00");
            assertThat(result.costPerformanceIndex()).isEqualTo(new BigDecimal("0.0000"));
            assertThat(result.schedulePerformanceIndex()).isNull();
            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(result.varianceAtCompletion()).isNull();
        }

        @Test
        @DisplayName("BAC = 0 sin costo: ningún índice aplica")
        void budgetZeroWithoutCost() {
            final EvmIndicators result = calculator.calculate(figures("0", "0", "0", "0"));

            assertThat(result.costPerformanceIndex()).isNull();
            assertThat(result.schedulePerformanceIndex()).isNull();
            assertThat(result.costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(result.estimateAtCompletion()).isNull();
            assertThat(result.varianceAtCompletion()).isNull();
        }
    }

    @Nested
    @DisplayName("Consolidado por proyecto")
    class ProjectConsolidation {

        private final Project project = new Project(PROJECT_ID, "Plataforma de pagos", null, null, null);

        @Test
        @DisplayName("suma BAC, PV, EV y AC de las tres actividades del seed y calcula sobre las sumas")
        void consolidatesSeedActivities() {
            // A1: BAC 100.000, 50 %, 40 %, AC 60.000 -> PV 50.000, EV 40.000
            // A2: BAC 250.000, 40 %, 45 %, AC 100.000 -> PV 100.000, EV 112.500
            // A3: BAC 80.000, 25 %, 0 %, AC 0 -> PV 20.000, EV 0
            // Sumas: BAC 430.000; PV 170.000; EV 152.500; AC 160.000
            // CV = -7.500; SV = -17.500
            // CPI = 152.500 / 160.000 = 0,953125 -> 0,9531; SPI = 152.500 / 170.000 = 0,89705... -> 0,8971
            // EAC = 430.000 x 160.000 / 152.500 = 451.147,5409... -> 451.147,54; VAC = -21.147,54
            final List<Activity> activities = List.of(
                    activity(10L, "Diseño de arquitectura", figures("100000", "50", "40", "60000")),
                    activity(11L, "Desarrollo del API", figures("250000", "40", "45", "100000")),
                    activity(12L, "Pruebas de integración", figures("80000", "25", "0", "0")));

            final ProjectEvmSummary summary = calculator.consolidate(project, activities);
            final EvmIndicators total = summary.indicators();

            assertThat(summary.project()).isEqualTo(project);
            assertThat(summary.budgetAtCompletion()).isEqualTo(new BigDecimal("430000.00"));
            assertThat(total.plannedValue()).isEqualTo(new BigDecimal("170000.00"));
            assertThat(total.earnedValue()).isEqualTo(new BigDecimal("152500.00"));
            assertThat(total.actualCost()).isEqualTo(new BigDecimal("160000.00"));
            assertThat(total.costVariance()).isEqualTo(new BigDecimal("-7500.00"));
            assertThat(total.scheduleVariance()).isEqualTo(new BigDecimal("-17500.00"));
            assertThat(total.costPerformanceIndex()).isEqualTo(new BigDecimal("0.9531"));
            assertThat(total.schedulePerformanceIndex()).isEqualTo(new BigDecimal("0.8971"));
            assertThat(total.estimateAtCompletion()).isEqualTo(new BigDecimal("451147.54"));
            assertThat(total.varianceAtCompletion()).isEqualTo(new BigDecimal("-21147.54"));
            assertThat(total.costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
            assertThat(total.scheduleStatus().status()).isEqualTo(PerformanceStatus.BEHIND_SCHEDULE);
        }

        @Test
        @DisplayName("conserva cada actividad con sus propios indicadores")
        void keepsPerActivityIndicators() {
            final List<Activity> activities = List.of(
                    activity(10L, "Diseño de arquitectura", figures("100000", "50", "40", "60000")),
                    activity(11L, "Desarrollo del API", figures("250000", "40", "45", "100000")));

            final ProjectEvmSummary summary = calculator.consolidate(project, activities);

            // A2: CV = 112.500 - 100.000 = 12.500; CPI = 1,1250; EAC = 250.000 x 100.000 / 112.500 = 222.222,22
            assertThat(summary.activities()).hasSize(2);
            assertThat(summary.activities().get(1).activity().name()).isEqualTo("Desarrollo del API");
            assertThat(summary.activities().get(1).indicators().costVariance()).isEqualTo(new BigDecimal("12500.00"));
            assertThat(summary.activities().get(1).indicators().costPerformanceIndex())
                    .isEqualTo(new BigDecimal("1.1250"));
            assertThat(summary.activities().get(1).indicators().estimateAtCompletion())
                    .isEqualTo(new BigDecimal("222222.22"));
            assertThat(summary.activities().get(1).indicators().varianceAtCompletion())
                    .isEqualTo(new BigDecimal("27777.78"));
        }

        @Test
        @DisplayName("no promedia índices: CPI 2,0 y CPI 0,5 consolidan en 1,0 sobre las sumas, no en 1,25")
        void doesNotAverageIndexes() {
            // A: BAC 1.000, 100 %, 100 %, AC 500 -> EV 1.000, CPI 2,0
            // B: BAC 1.000, 100 %, 50 %, AC 1.000 -> EV 500, CPI 0,5
            // Sumas: EV 1.500, AC 1.500 -> CPI 1,0000 (el promedio de índices daría 1,25)
            final List<Activity> activities = List.of(
                    activity(20L, "A", figures("1000", "100", "100", "500")),
                    activity(21L, "B", figures("1000", "100", "50", "1000")));

            final EvmIndicators total = calculator.consolidate(project, activities).indicators();

            assertThat(total.costPerformanceIndex()).isEqualTo(new BigDecimal("1.0000"));
            assertThat(total.costStatus().status()).isEqualTo(PerformanceStatus.ON_BUDGET);
        }

        @Test
        @DisplayName("proyecto sin actividades: sumas en cero e índices no aplicables")
        void emptyProjectHasZeroTotalsAndNoIndexes() {
            final ProjectEvmSummary summary = calculator.consolidate(project, List.of());
            final EvmIndicators total = summary.indicators();

            assertThat(summary.activities()).isEmpty();
            assertThat(summary.budgetAtCompletion()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.plannedValue()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.earnedValue()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.actualCost()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.costVariance()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.scheduleVariance()).isEqualTo(new BigDecimal("0.00"));
            assertThat(total.costPerformanceIndex()).isNull();
            assertThat(total.schedulePerformanceIndex()).isNull();
            assertThat(total.estimateAtCompletion()).isNull();
            assertThat(total.varianceAtCompletion()).isNull();
            assertThat(total.costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            assertThat(total.scheduleStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
        }
    }
}
