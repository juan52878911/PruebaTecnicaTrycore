package com.trycore.evm.application.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectMeasurementRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.InvalidMeasurementException;
import com.trycore.evm.domain.exception.MeasurementAlreadyExistsException;
import com.trycore.evm.domain.exception.MeasurementNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectMeasurement;
import com.trycore.evm.domain.model.ProjectTimeline;
import com.trycore.evm.domain.service.EvmCalculator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas de {@link ProjectMeasurementService} con dobles de los puertos de salida, sin
 * infraestructura real. El {@link EvmCalculator} es el real: es puro y sus resultados ya están
 * verificados en su propio test.
 *
 * <p>Los valores esperados están derivados a mano de la fórmula, no copiados de la salida.
 *
 * <p>El reloj es fijo. La regla de que un corte no puede ser futuro depende de qué día es hoy, y con
 * el reloj del sistema la prueba diría cosas distintas según cuándo se ejecute.
 */
@ExtendWith(MockitoExtension.class)
class ProjectMeasurementServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final Long ACTIVITY_ID = 10L;
    private static final Long MEASUREMENT_ID = 5L;
    private static final Long MISSING_MEASUREMENT_ID = 999L;
    private static final LocalDate TODAY = LocalDate.parse("2026-09-04");
    private static final LocalDate CUTOFF = LocalDate.parse("2026-08-24");
    private static final LocalDate LATER_CUTOFF = LocalDate.parse("2026-08-31");
    private static final Clock FIXED_CLOCK =
            Clock.fixed(TODAY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
    private static final String NOTES = "Cierre de la semana 1";

    @Mock
    private ProjectRepositoryPort projectRepository;

    @Mock
    private ActivityRepositoryPort activityRepository;

    @Mock
    private ProjectMeasurementRepositoryPort measurementRepository;

    private ProjectMeasurementService measurementService;

    private final Project project = new Project(PROJECT_ID, "Plataforma de pagos", null, null, null);

    @BeforeEach
    void setUp() {
        measurementService = new ProjectMeasurementService(
                projectRepository, activityRepository, measurementRepository, new EvmCalculator(), FIXED_CLOCK);
    }

    /** Actividad de referencia: BAC 100.000, avance planificado 50 %, real 40 %, costo 60.000. */
    private static Activity referenceActivity() {
        final ActivityFigures figures = new ActivityFigures(
                new BigDecimal("100000"), new BigDecimal("50"), new BigDecimal("40"), new BigDecimal("60000"));
        return new Activity(
                ACTIVITY_ID, PROJECT_ID, "Diseño de arquitectura", figures, ActivitySchedule.empty(), null, null);
    }

    private static EvmTotals totals(final String bac, final String pv, final String ev, final String ac) {
        return new EvmTotals(new BigDecimal(bac), new BigDecimal(pv), new BigDecimal(ev), new BigDecimal(ac));
    }

    private static ProjectMeasurement storedMeasurement(final LocalDate cutoffDate, final EvmTotals figures) {
        return new ProjectMeasurement(MEASUREMENT_ID, PROJECT_ID, cutoffDate, NOTES, figures, List.of(), null);
    }

    @Test
    @DisplayName("record congela las cifras actuales del proyecto y guarda el corte")
    void recordCapturesCurrentFiguresAndSaves() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.existsByProjectIdAndCutoffDate(PROJECT_ID, CUTOFF)).thenReturn(false);
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of(referenceActivity()));
        when(measurementRepository.save(any(ProjectMeasurement.class))).thenAnswer(call -> call.getArgument(0));

        final ProjectMeasurement result = measurementService.record(PROJECT_ID, CUTOFF, NOTES);

        // PV = 0,50 x 100.000 = 50.000; EV = 0,40 x 100.000 = 40.000; AC = 60.000
        assertThat(result.projectId()).isEqualTo(PROJECT_ID);
        assertThat(result.cutoffDate()).isEqualTo(CUTOFF);
        assertThat(result.notes()).isEqualTo(NOTES);
        assertThat(result.totals().budgetAtCompletion()).isEqualByComparingTo("100000.00");
        assertThat(result.totals().plannedValue()).isEqualByComparingTo("50000.00");
        assertThat(result.totals().earnedValue()).isEqualByComparingTo("40000.00");
        assertThat(result.totals().actualCost()).isEqualByComparingTo("60000.00");
        assertThat(result.activities()).hasSize(1);
        assertThat(result.activities().get(0).activityName()).isEqualTo("Diseño de arquitectura");
    }

    @Test
    @DisplayName("record en un proyecto inexistente lanza ProjectNotFoundException y no guarda")
    void recordInMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> measurementService.record(MISSING_PROJECT_ID, CUTOFF, NOTES))
                .isInstanceOf(ProjectNotFoundException.class);
        verify(measurementRepository, never()).save(any());
    }

    @Test
    @DisplayName("record con una fecha que ya tiene corte lanza MeasurementAlreadyExistsException")
    void recordOnDuplicateCutoffThrows() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.existsByProjectIdAndCutoffDate(PROJECT_ID, CUTOFF)).thenReturn(true);

        assertThatThrownBy(() -> measurementService.record(PROJECT_ID, CUTOFF, NOTES))
                .isInstanceOf(MeasurementAlreadyExistsException.class)
                .hasMessageContaining(CUTOFF.toString());
        verify(measurementRepository, never()).save(any());
    }

    @Test
    @DisplayName("record con una fecha futura lanza InvalidMeasurementException y no guarda")
    void recordWithFutureCutoffThrows() {
        final LocalDate tomorrow = TODAY.plusDays(1);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.existsByProjectIdAndCutoffDate(PROJECT_ID, tomorrow)).thenReturn(false);

        assertThatThrownBy(() -> measurementService.record(PROJECT_ID, tomorrow, NOTES))
                .isInstanceOf(InvalidMeasurementException.class)
                .hasMessageContaining("no puede ser futura");
        verify(measurementRepository, never()).save(any());
    }

    @Test
    @DisplayName("record con la fecha de hoy es válido: hoy ya ocurrió")
    void recordWithTodayIsAccepted() {
        final LocalDate today = TODAY;
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.existsByProjectIdAndCutoffDate(PROJECT_ID, today)).thenReturn(false);
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of());
        when(measurementRepository.save(any(ProjectMeasurement.class))).thenAnswer(call -> call.getArgument(0));

        final ProjectMeasurement result = measurementService.record(PROJECT_ID, today, null);

        assertThat(result.cutoffDate()).isEqualTo(today);
        assertThat(result.activities()).isEmpty();
        assertThat(result.totals().budgetAtCompletion()).isEqualByComparingTo("0.00");
    }

    @Test
    @DisplayName("record sin fecha de corte lo rechaza el propio modelo, no la persistencia")
    void recordWithoutCutoffThrows() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.existsByProjectIdAndCutoffDate(PROJECT_ID, null)).thenReturn(false);
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> measurementService.record(PROJECT_ID, null, NOTES))
                .isInstanceOf(InvalidMeasurementException.class);
        verify(measurementRepository, never()).save(any());
    }

    @Test
    @DisplayName("list en un proyecto existente devuelve sus cortes")
    void listInExistingProjectReturnsMeasurements() {
        when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);
        final ProjectMeasurement stored = storedMeasurement(CUTOFF, totals("100000", "50000", "40000", "60000"));
        when(measurementRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of(stored));

        final List<ProjectMeasurement> result = measurementService.list(PROJECT_ID);

        assertThat(result).containsExactly(stored);
    }

    @Test
    @DisplayName("list en un proyecto inexistente lanza ProjectNotFoundException")
    void listInMissingProjectThrows() {
        when(projectRepository.existsById(MISSING_PROJECT_ID)).thenReturn(false);

        assertThatThrownBy(() -> measurementService.list(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }

    @Test
    @DisplayName("get devuelve el corte que pertenece al proyecto")
    void getReturnsMeasurement() {
        final ProjectMeasurement stored = storedMeasurement(CUTOFF, totals("100000", "50000", "40000", "60000"));
        when(measurementRepository.findByIdAndProjectId(MEASUREMENT_ID, PROJECT_ID))
                .thenReturn(Optional.of(stored));

        assertThat(measurementService.get(PROJECT_ID, MEASUREMENT_ID)).isEqualTo(stored);
    }

    @Test
    @DisplayName("get de un corte que no existe en el proyecto lanza MeasurementNotFoundException")
    void getMissingMeasurementThrows() {
        when(measurementRepository.findByIdAndProjectId(MISSING_MEASUREMENT_ID, PROJECT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> measurementService.get(PROJECT_ID, MISSING_MEASUREMENT_ID))
                .isInstanceOf(MeasurementNotFoundException.class);
    }

    @Test
    @DisplayName("delete de un corte existente en el proyecto lo elimina")
    void deleteExistingMeasurementDeletes() {
        final ProjectMeasurement stored = storedMeasurement(CUTOFF, totals("100000", "50000", "40000", "60000"));
        when(measurementRepository.findByIdAndProjectId(MEASUREMENT_ID, PROJECT_ID))
                .thenReturn(Optional.of(stored));

        measurementService.delete(PROJECT_ID, MEASUREMENT_ID);

        verify(measurementRepository).deleteById(MEASUREMENT_ID);
    }

    @Test
    @DisplayName("delete de un corte que no existe en el proyecto lanza MeasurementNotFoundException")
    void deleteMissingMeasurementThrows() {
        when(measurementRepository.findByIdAndProjectId(MISSING_MEASUREMENT_ID, PROJECT_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> measurementService.delete(PROJECT_ID, MISSING_MEASUREMENT_ID))
                .isInstanceOf(MeasurementNotFoundException.class);
        verify(measurementRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("timeline devuelve los puntos ordenados y con los indicadores calculados")
    void timelineReturnsOrderedPointsWithIndicators() {
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(measurementRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of(
                storedMeasurement(LATER_CUTOFF, totals("100000", "80000", "70000", "80000")),
                storedMeasurement(CUTOFF, totals("100000", "50000", "40000", "60000"))));

        final ProjectTimeline timeline = measurementService.timeline(PROJECT_ID);

        assertThat(timeline.project()).isEqualTo(project);
        assertThat(timeline.points()).extracting("cutoffDate").containsExactly(CUTOFF, LATER_CUTOFF);

        // Corte 1: CPI = 40.000 / 60.000 = 0,6667; SPI = 40.000 / 50.000 = 0,8000
        // EAC = 100.000 x 60.000 / 40.000 = 150.000; VAC = 100.000 - 150.000 = -50.000
        assertThat(timeline.points().get(0).indicators().costPerformanceIndex()).isEqualByComparingTo("0.6667");
        assertThat(timeline.points().get(0).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8000");
        assertThat(timeline.points().get(0).indicators().estimateAtCompletion()).isEqualByComparingTo("150000.00");
        assertThat(timeline.points().get(0).indicators().varianceAtCompletion()).isEqualByComparingTo("-50000.00");
        assertThat(timeline.points().get(0).indicators().costStatus().status())
                .isEqualTo(PerformanceStatus.OVER_BUDGET);

        // Corte 2: CPI = 70.000 / 80.000 = 0,8750; SPI = 70.000 / 80.000 = 0,8750
        assertThat(timeline.points().get(1).indicators().costPerformanceIndex()).isEqualByComparingTo("0.8750");
        assertThat(timeline.points().get(1).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8750");
    }

    @Test
    @DisplayName("timeline en un proyecto inexistente lanza ProjectNotFoundException")
    void timelineInMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> measurementService.timeline(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}
