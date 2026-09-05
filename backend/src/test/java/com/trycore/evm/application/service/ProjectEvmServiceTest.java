package com.trycore.evm.application.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.PerformanceStatus;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;
import com.trycore.evm.domain.service.EvmCalculator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Pruebas de {@link ProjectEvmService} con dobles de los puertos de salida.
 *
 * <p>El {@link EvmCalculator} es el real, igual que en {@code ActivityServiceTest}: es puro, no
 * tiene dependencias y sus resultados ya están verificados en su propio test. Sustituirlo por un
 * doble solo permitiría comprobar que se le llamó, no que el análisis devuelto tiene sentido.
 */
@ExtendWith(MockitoExtension.class)
class ProjectEvmServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final Long FIRST_ACTIVITY_ID = 10L;
    private static final Long SECOND_ACTIVITY_ID = 11L;

    @Mock
    private ProjectRepositoryPort projectRepository;

    @Mock
    private ActivityRepositoryPort activityRepository;

    private ProjectEvmService projectEvmService;

    @BeforeEach
    void setUp() {
        projectEvmService = new ProjectEvmService(projectRepository, activityRepository, new EvmCalculator());
    }

    private static Project existingProject() {
        return new Project(PROJECT_ID, "Plataforma de pagos", "Descripción", Instant.now(), Instant.now());
    }

    private static Activity activity(
            final Long id, final String name, final String budget, final String planned,
            final String actual, final String cost) {
        final ActivityFigures figures = new ActivityFigures(
                new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost));
        return new Activity(id, PROJECT_ID, name, figures, ActivitySchedule.empty(), Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("analyze consolida las actividades del proyecto sobre las sumas")
    void analyzeConsolidatesProjectActivities() {
        // A1: BAC 100.000, 50 %, 40 %, AC 60.000 -> PV 50.000, EV 40.000
        // A2: BAC 250.000, 40 %, 45 %, AC 100.000 -> PV 100.000, EV 112.500
        // Sumas: BAC 350.000; PV 150.000; EV 152.500; AC 160.000
        // CPI = 152.500 / 160.000 = 0,953125 -> 0,9531; SPI = 152.500 / 150.000 = 1,01666... -> 1,0167
        final Project project = existingProject();
        final List<Activity> activities = List.of(
                activity(FIRST_ACTIVITY_ID, "Diseño de arquitectura", "100000", "50", "40", "60000"),
                activity(SECOND_ACTIVITY_ID, "Desarrollo del API", "250000", "40", "45", "100000"));
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(activities);

        final ProjectEvmSummary result = projectEvmService.analyze(PROJECT_ID);

        assertThat(result.project()).isEqualTo(project);
        assertThat(result.activities()).hasSize(2);
        assertThat(result.budgetAtCompletion()).isEqualByComparingTo("350000.00");
        assertThat(result.indicators().plannedValue()).isEqualByComparingTo("150000.00");
        assertThat(result.indicators().earnedValue()).isEqualByComparingTo("152500.00");
        assertThat(result.indicators().actualCost()).isEqualByComparingTo("160000.00");
        assertThat(result.indicators().costPerformanceIndex()).isEqualByComparingTo("0.9531");
        assertThat(result.indicators().schedulePerformanceIndex()).isEqualByComparingTo("1.0167");
        assertThat(result.indicators().costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
        assertThat(result.indicators().scheduleStatus().status()).isEqualTo(PerformanceStatus.AHEAD_OF_SCHEDULE);
    }

    @Test
    @DisplayName("analyze de un proyecto sin actividades devuelve sumas en cero e índices no aplicables")
    void analyzeProjectWithoutActivities() {
        final Project project = existingProject();
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of());

        final ProjectEvmSummary result = projectEvmService.analyze(PROJECT_ID);

        assertThat(result.activities()).isEmpty();
        assertThat(result.budgetAtCompletion()).isEqualByComparingTo("0.00");
        assertThat(result.indicators().costPerformanceIndex()).isNull();
        assertThat(result.indicators().schedulePerformanceIndex()).isNull();
        assertThat(result.indicators().costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
    }

    @Test
    @DisplayName("analyze de un proyecto inexistente lanza ProjectNotFoundException")
    void analyzeMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectEvmService.analyze(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}
