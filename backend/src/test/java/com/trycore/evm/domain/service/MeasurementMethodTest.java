package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.MeasurementMethod;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.ProgressMeasurement;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reglas de medición del avance.
 *
 * <p>El caso base de todas las comparaciones es el canónico del proyecto: BAC 100.000, planificado
 * 50 %, real 40 %, AC 60.000. Con la regla por defecto da PV 50.000 y EV 40.000; lo interesante es
 * cómo lo cambia cada regla. Todos los valores esperados están derivados a mano.
 */
class MeasurementMethodTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long FIRST_ACTIVITY_ID = 10L;
    private static final Long SECOND_ACTIVITY_ID = 11L;
    private static final LocalDate STARTED_ON = LocalDate.parse("2026-01-10");

    private final EvmCalculator calculator = new EvmCalculator();
    private final Project project = new Project(PROJECT_ID, "Planta Solar Norte", null, null, null);

    private static ActivityFigures figures(
            final String budget, final String planned, final String actual, final String cost) {
        return new ActivityFigures(
                new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost));
    }

    private static Activity activity(
            final MeasurementMethod method, final ActivityFigures figures, final ActivitySchedule schedule) {
        return new Activity(
                FIRST_ACTIVITY_ID, PROJECT_ID, "Obra civil", figures, schedule,
                new ProgressMeasurement(method), null, null);
    }

    private static Activity canonical(final MeasurementMethod method) {
        return activity(method, figures("100000", "50", "40", "60000"), ActivitySchedule.empty());
    }

    @Nested
    @DisplayName("Porcentaje completado")
    class PercentComplete {

        @Test
        @DisplayName("reconoce el avance declarado tal cual: es el comportamiento de siempre")
        void recognisesTheReportedProgress() {
            // PV = 0,50 x 100.000 = 50.000; EV = 0,40 x 100.000 = 40.000
            // CPI = 40.000 / 60.000 = 0,6667; SPI = 40.000 / 50.000 = 0,8000
            final EvmIndicators result = calculator.calculate(canonical(MeasurementMethod.PERCENT_COMPLETE));

            assertThat(result.plannedValue()).isEqualByComparingTo("50000.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("40000.00");
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.6667");
            assertThat(result.schedulePerformanceIndex()).isEqualByComparingTo("0.8000");
        }

        @Test
        @DisplayName("una actividad sin regla declarada se mide como porcentaje completado")
        void defaultsToPercentComplete() {
            final Activity withoutMethod = Activity.create(
                    PROJECT_ID, "Obra civil", figures("100000", "50", "40", "60000"), ActivitySchedule.empty());

            assertThat(withoutMethod.progress().method()).isEqualTo(MeasurementMethod.PERCENT_COMPLETE);
            assertThat(calculator.calculate(withoutMethod).earnedValue()).isEqualByComparingTo("40000.00");
        }
    }

    @Nested
    @DisplayName("Todo o nada")
    class FixedZeroOrHundred {

        @Test
        @DisplayName("la regla se aplica a los dos lados, así que el atraso no se inventa")
        void ruleAppliesToBothSides() {
            // Con la regla en los dos lados: PV = 0 y EV = 0, luego SV = 0 y el SPI no aplica.
            // Si se aplicara solo al valor ganado, PV seguiría siendo 50.000 y saldría SV = -50.000
            // con SPI 0,0000: una actividad al día declarada como atrasada crítica.
            final EvmIndicators result = calculator.calculate(canonical(MeasurementMethod.FIXED_0_100));

            assertThat(result.plannedValue()).isEqualByComparingTo("0.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("0.00");
            assertThat(result.schedulePerformanceIndex()).isNull();
            assertThat(result.scheduleStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
            // El costo sí está gastado: CV = 0 - 60.000
            assertThat(result.costVariance()).isEqualByComparingTo("-60000.00");
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.0000");
        }

        @Test
        @DisplayName("al 99,99 % todavía no reconoce nada")
        void recognisesNothingJustBeforeCompletion() {
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_0_100,
                            figures("100000", "100", "99.99", "60000"), ActivitySchedule.empty()));

            assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
            // El plan sí llegó al 100 %, así que el lado planificado reconoce todo
            assertThat(result.plannedValue()).isEqualByComparingTo("100000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("-100000.00");
        }

        @Test
        @DisplayName("al cerrar reconoce el presupuesto entero")
        void recognisesEverythingOnCompletion() {
            // BAC 100.000 al 100 % por ambos lados, AC 60.000
            // CPI = 100.000 / 60.000 = 1,666666... -> 1,6667; SPI = 1,0000
            // EAC = 100.000 x 60.000 / 100.000 = 60.000; VAC = 40.000
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_0_100,
                            figures("100000", "100", "100", "60000"), ActivitySchedule.empty()));

            assertThat(result.earnedValue()).isEqualByComparingTo("100000.00");
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("1.6667");
            assertThat(result.schedulePerformanceIndex()).isEqualByComparingTo("1.0000");
            assertThat(result.estimateAtCompletion()).isEqualByComparingTo("60000.00");
            assertThat(result.varianceAtCompletion()).isEqualByComparingTo("40000.00");
        }
    }

    @Nested
    @DisplayName("Mitad al iniciar, mitad al cerrar")
    class FixedFiftyFifty {

        @Test
        @DisplayName("una actividad en curso reconoce la mitad por cada lado")
        void recognisesHalfWhenStarted() {
            // Planificado 50 % y real 40 %, ambos en curso: PV = EV = 50.000
            // CPI = 50.000 / 60.000 = 0,833333... -> 0,8333; SPI = 1,0000
            // EAC = 100.000 x 60.000 / 50.000 = 120.000; VAC = -20.000
            final EvmIndicators result = calculator.calculate(canonical(MeasurementMethod.FIXED_50_50));

            assertThat(result.plannedValue()).isEqualByComparingTo("50000.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("50000.00");
            assertThat(result.scheduleVariance()).isEqualByComparingTo("0.00");
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.8333");
            assertThat(result.schedulePerformanceIndex()).isEqualByComparingTo("1.0000");
            assertThat(result.estimateAtCompletion()).isEqualByComparingTo("120000.00");
        }

        @Test
        @DisplayName("iniciada solo por su fecha real, con avance declarado cero, reconoce la mitad")
        void startedByDateAloneStillRecognisesHalf() {
            // Es el escenario para el que existe la regla: quien la usa no estima el avance
            // intermedio y deja el porcentaje a cero hasta cerrar. Deducir "iniciada" del
            // porcentaje anularía el método justo aquí.
            final ActivitySchedule started = new ActivitySchedule(null, null, STARTED_ON, null);
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_50_50, figures("100000", "50", "0", "60000"), started));

            assertThat(result.earnedValue()).isEqualByComparingTo("50000.00");
            assertThat(result.costPerformanceIndex()).isEqualByComparingTo("0.8333");
        }

        @Test
        @DisplayName("sin iniciar no reconoce nada")
        void recognisesNothingBeforeStarting() {
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_50_50,
                            figures("100000", "0", "0", "0"), ActivitySchedule.empty()));

            assertThat(result.plannedValue()).isEqualByComparingTo("0.00");
            assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
            assertThat(result.costPerformanceIndex()).isNull();
            assertThat(result.schedulePerformanceIndex()).isNull();
        }

        @Test
        @DisplayName("el avance más pequeño ya cuenta como iniciada")
        void theSmallestProgressCountsAsStarted() {
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_50_50,
                            figures("100000", "50", "0.01", "60000"), ActivitySchedule.empty()));

            assertThat(result.earnedValue()).isEqualByComparingTo("50000.00");
        }

        @Test
        @DisplayName("al cerrar reconoce el presupuesto entero")
        void recognisesEverythingOnCompletion() {
            final EvmIndicators result = calculator.calculate(
                    activity(MeasurementMethod.FIXED_50_50,
                            figures("100000", "100", "100", "60000"), ActivitySchedule.empty()));

            assertThat(result.earnedValue()).isEqualByComparingTo("100000.00");
        }
    }

    @Nested
    @DisplayName("Casos comunes a todas las reglas")
    class Shared {

        @Test
        @DisplayName("con presupuesto cero todas las reglas degradan igual")
        void everyMethodDegradesTheSameWithoutBudget() {
            for (final MeasurementMethod method : MeasurementMethod.values()) {
                final EvmIndicators result = calculator.calculate(
                        activity(method, figures("0", "100", "100", "0"), ActivitySchedule.empty()));

                assertThat(result.plannedValue()).isEqualByComparingTo("0.00");
                assertThat(result.earnedValue()).isEqualByComparingTo("0.00");
                assertThat(result.costPerformanceIndex()).isNull();
            }
        }

        @Test
        @DisplayName("los porcentajes efectivos acompañan a la actividad para que la regla sea visible")
        void effectivePercentagesTravelWithTheActivity() {
            final List<Activity> activities = List.of(
                    activity(MeasurementMethod.FIXED_0_100,
                            figures("100000", "50", "40", "60000"), ActivitySchedule.empty()));

            final ProjectEvmSummary summary = calculator.consolidate(project, activities);

            assertThat(summary.activities().get(0).activity().figures().actualProgressPercent())
                    .isEqualByComparingTo("40");
            assertThat(summary.activities().get(0).effectiveActualPercent()).isEqualByComparingTo("0");
            assertThat(summary.activities().get(0).effectivePlannedPercent()).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("un proyecto con reglas mezcladas sigue consolidando sobre las sumas, sin promediar")
        void mixedMethodsStillConsolidateOverSums() {
            // A1 por porcentaje: BAC 100.000, 50 %, 40 %, AC 60.000 -> PV 50.000, EV 40.000
            // A2 por todo o nada: BAC 200.000, 100 %, 100 %, AC 100.000 -> PV 200.000, EV 200.000
            // Sumas: BAC 300.000; PV 250.000; EV 240.000; AC 160.000
            // CPI = 240.000 / 160.000 = 1,5000; SPI = 240.000 / 250.000 = 0,9600
            final List<Activity> activities = List.of(
                    activity(MeasurementMethod.PERCENT_COMPLETE,
                            figures("100000", "50", "40", "60000"), ActivitySchedule.empty()),
                    new Activity(
                            SECOND_ACTIVITY_ID, PROJECT_ID, "Montaje",
                            figures("200000", "100", "100", "100000"), ActivitySchedule.empty(),
                            new ProgressMeasurement(MeasurementMethod.FIXED_0_100), null, null));

            final ProjectEvmSummary summary = calculator.consolidate(project, activities);

            assertThat(summary.budgetAtCompletion()).isEqualByComparingTo("300000.00");
            assertThat(summary.indicators().plannedValue()).isEqualByComparingTo("250000.00");
            assertThat(summary.indicators().earnedValue()).isEqualByComparingTo("240000.00");
            assertThat(summary.indicators().costPerformanceIndex()).isEqualByComparingTo("1.5000");
            assertThat(summary.indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.9600");
        }
    }
}
