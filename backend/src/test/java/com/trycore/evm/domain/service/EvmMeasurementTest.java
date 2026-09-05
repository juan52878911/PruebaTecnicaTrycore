package com.trycore.evm.domain.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectMeasurement;
import com.trycore.evm.domain.model.ProjectTimeline;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas del histórico: capturar un corte y construir la serie temporal.
 *
 * <p>Como en el resto del cálculo, los valores esperados están derivados a mano de la fórmula y
 * escritos literalmente.
 */
class EvmMeasurementTest {

    private static final Long PROJECT_ID = 1L;
    private static final LocalDate FIRST_CUTOFF = LocalDate.parse("2026-09-07");
    private static final LocalDate SECOND_CUTOFF = LocalDate.parse("2026-09-14");
    private static final LocalDate THIRD_CUTOFF = LocalDate.parse("2026-09-21");
    private static final Long API_ACTIVITY_ID = 11L;
    private static final int SEED_ACTIVITY_COUNT = 3;
    private static final int TIMELINE_POINT_COUNT = 3;

    private final EvmCalculator calculator = new EvmCalculator();
    private final Project project = new Project(PROJECT_ID, "Plataforma de pagos", null, null, null);

    private static Activity activity(
            final Long id, final String name, final String budget, final String planned,
            final String actual, final String cost) {
        final ActivityFigures figures = new ActivityFigures(
                new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost));
        return new Activity(id, PROJECT_ID, name, figures, ActivitySchedule.empty(), null, null);
    }

    private static EvmTotals totals(final String bac, final String pv, final String ev, final String ac) {
        return new EvmTotals(new BigDecimal(bac), new BigDecimal(pv), new BigDecimal(ev), new BigDecimal(ac));
    }

    @Test
    @DisplayName("los indicadores de unas cifras dadas son los mismos que los del cálculo en vivo")
    void indicatorsFromTotalsMatchTheLiveCalculation() {
        // BAC 100.000, PV 50.000, EV 40.000, AC 60.000: el caso canónico, esta vez desde cifras
        // ya conocidas en lugar de porcentajes. CPI 0,6667; SPI 0,8000; EAC 150.000; VAC -50.000
        final var fromTotals = calculator.calculate(totals("100000", "50000", "40000", "60000"));
        final var fromPercentages = calculator.calculate(
                new ActivityFigures(
                        new BigDecimal("100000"), new BigDecimal("50"),
                        new BigDecimal("40"), new BigDecimal("60000")));

        assertThat(fromTotals.costPerformanceIndex()).isEqualByComparingTo("0.6667");
        assertThat(fromTotals.schedulePerformanceIndex()).isEqualByComparingTo("0.8000");
        assertThat(fromTotals.estimateAtCompletion()).isEqualByComparingTo("150000.00");
        assertThat(fromTotals.varianceAtCompletion()).isEqualByComparingTo("-50000.00");
        assertThat(fromTotals).isEqualTo(fromPercentages);
    }

    @Test
    @DisplayName("capturar un corte congela las cifras del proyecto y de cada actividad")
    void captureFreezesProjectAndActivityFigures() {
        // Las tres actividades de demostración: sumas BAC 430.000, PV 170.000, EV 152.500, AC 160.000
        final List<Activity> activities = List.of(
                activity(10L, "Diseño de arquitectura", "100000", "50", "40", "60000"),
                activity(API_ACTIVITY_ID, "Desarrollo del API", "250000", "40", "45", "100000"),
                activity(12L, "Pruebas de integración", "80000", "25", "0", "0"));

        final ProjectMeasurement measurement =
                calculator.capture(project, activities, FIRST_CUTOFF, "Corte semanal");

        assertThat(measurement.projectId()).isEqualTo(PROJECT_ID);
        assertThat(measurement.cutoffDate()).isEqualTo(FIRST_CUTOFF);
        assertThat(measurement.notes()).isEqualTo("Corte semanal");
        assertThat(measurement.totals().budgetAtCompletion()).isEqualByComparingTo("430000.00");
        assertThat(measurement.totals().plannedValue()).isEqualByComparingTo("170000.00");
        assertThat(measurement.totals().earnedValue()).isEqualByComparingTo("152500.00");
        assertThat(measurement.totals().actualCost()).isEqualByComparingTo("160000.00");
        assertThat(measurement.activities()).hasSize(SEED_ACTIVITY_COUNT);
    }

    @Test
    @DisplayName("cada línea del corte guarda el nombre de la actividad, no solo su identificador")
    void captureKeepsTheActivityNameForTheRecord() {
        final List<Activity> activities = List.of(
                activity(API_ACTIVITY_ID, "Desarrollo del API", "250000", "40", "45", "100000"));

        final ProjectMeasurement measurement = calculator.capture(project, activities, FIRST_CUTOFF, null);

        // A2: PV = 0,40 x 250.000 = 100.000; EV = 0,45 x 250.000 = 112.500
        assertThat(measurement.activities().get(0).activityId()).isEqualTo(API_ACTIVITY_ID);
        assertThat(measurement.activities().get(0).activityName()).isEqualTo("Desarrollo del API");
        assertThat(measurement.activities().get(0).totals().budgetAtCompletion()).isEqualByComparingTo("250000.00");
        assertThat(measurement.activities().get(0).totals().plannedValue()).isEqualByComparingTo("100000.00");
        assertThat(measurement.activities().get(0).totals().earnedValue()).isEqualByComparingTo("112500.00");
        assertThat(measurement.activities().get(0).totals().actualCost()).isEqualByComparingTo("100000.00");
    }

    @Test
    @DisplayName("capturar un proyecto sin actividades da un corte válido con todo en cero")
    void captureOfEmptyProject() {
        final ProjectMeasurement measurement = calculator.capture(project, List.of(), FIRST_CUTOFF, null);

        assertThat(measurement.activities()).isEmpty();
        assertThat(measurement.totals().budgetAtCompletion()).isEqualByComparingTo("0.00");
        assertThat(measurement.totals().earnedValue()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("la serie temporal ordena por fecha de corte y trae los indicadores calculados")
    void timelineIsOrderedAndCarriesIndicators() {
        // Tres cortes desordenados a propósito. Semana 1: EV 10.000 / AC 12.000 -> CPI 0,8333
        // Semana 2: EV 30.000 / AC 30.000 -> CPI 1,0000. Semana 3: EV 60.000 / AC 50.000 -> CPI 1,2000
        final List<ProjectMeasurement> measurements = List.of(
                new ProjectMeasurement(
                        3L, PROJECT_ID, THIRD_CUTOFF, null, totals("100000", "55000", "60000", "50000"),
                        List.of(), null),
                new ProjectMeasurement(
                        1L, PROJECT_ID, FIRST_CUTOFF, "Arranque", totals("100000", "15000", "10000", "12000"),
                        List.of(), null),
                new ProjectMeasurement(
                        2L, PROJECT_ID, SECOND_CUTOFF, null, totals("100000", "30000", "30000", "30000"),
                        List.of(), null));

        final ProjectTimeline timeline = calculator.buildTimeline(project, measurements);

        assertThat(timeline.project()).isEqualTo(project);
        assertThat(timeline.points()).hasSize(TIMELINE_POINT_COUNT);
        assertThat(timeline.points()).extracting("cutoffDate")
                .containsExactly(FIRST_CUTOFF, SECOND_CUTOFF, THIRD_CUTOFF);

        // CPI = 10.000 / 12.000 = 0,8333; SPI = 10.000 / 15.000 = 0,6667
        assertThat(timeline.points().get(0).notes()).isEqualTo("Arranque");
        assertThat(timeline.points().get(0).indicators().costPerformanceIndex()).isEqualByComparingTo("0.8333");
        assertThat(timeline.points().get(0).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.6667");
        assertThat(timeline.points().get(0).indicators().costStatus().status())
                .isEqualTo(PerformanceStatus.OVER_BUDGET);

        assertThat(timeline.points().get(1).indicators().costPerformanceIndex()).isEqualByComparingTo("1.0000");
        assertThat(timeline.points().get(1).indicators().costStatus().status()).isEqualTo(PerformanceStatus.ON_BUDGET);

        // CPI = 60.000 / 50.000 = 1,2000; SPI = 60.000 / 55.000 = 1,0909
        assertThat(timeline.points().get(2).indicators().costPerformanceIndex()).isEqualByComparingTo("1.2000");
        assertThat(timeline.points().get(2).indicators().schedulePerformanceIndex()).isEqualByComparingTo("1.0909");
        assertThat(timeline.points().get(2).indicators().costStatus().status())
                .isEqualTo(PerformanceStatus.UNDER_BUDGET);
    }

    @Test
    @DisplayName("un corte sin costo real da un punto con índice de costo no aplicable")
    void timelinePointWithoutActualCost() {
        final List<ProjectMeasurement> measurements = List.of(
                new ProjectMeasurement(
                        1L, PROJECT_ID, FIRST_CUTOFF, null, totals("100000", "15000", "0", "0"), List.of(), null));

        final ProjectTimeline timeline = calculator.buildTimeline(project, measurements);

        assertThat(timeline.points().get(0).indicators().costPerformanceIndex()).isNull();
        assertThat(timeline.points().get(0).indicators().costStatus().status())
                .isEqualTo(PerformanceStatus.NOT_APPLICABLE);
        assertThat(timeline.points().get(0).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.0000");
    }

    @Test
    @DisplayName("un proyecto sin cortes da una serie vacía, no un error")
    void timelineOfProjectWithoutMeasurements() {
        final ProjectTimeline timeline = calculator.buildTimeline(project, List.of());

        assertThat(timeline.points()).isEmpty();
        assertThat(timeline.project()).isEqualTo(project);
    }
}
