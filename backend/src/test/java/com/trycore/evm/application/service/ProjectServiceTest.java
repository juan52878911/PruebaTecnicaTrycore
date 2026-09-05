package com.trycore.evm.application.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pruebas de {@link ProjectService} con dobles de los puertos de salida, sin infraestructura real. */
@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long EMPTY_PROJECT_ID = 2L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final String NAME = "Plataforma de pagos";
    private static final String DESCRIPTION = "Proyecto de demostración";
    private static final String MANAGER = "Alicia Ramos";
    private static final String NEW_NAME = "Plataforma de pagos v2";
    private static final String NEW_DESCRIPTION = "Descripción actualizada";
    private static final String NEW_MANAGER = "Marcos Villalba";
    private static final String EMPTY_PROJECT_NAME = "Data warehouse fase II";

    // Cifras de las dos actividades del proyecto con actividades. Se eligen redondas para que el
    // consolidado se pueda derivar a mano sin arrastrar decimales.
    private static final String FIRST_BUDGET = "100000";
    private static final String FIRST_PLANNED_PERCENT = "50";
    private static final String FIRST_ACTUAL_PERCENT = "40";
    private static final String FIRST_ACTUAL_COST = "60000";
    private static final String SECOND_BUDGET = "200000";
    private static final String SECOND_PLANNED_PERCENT = "25";
    private static final String SECOND_ACTUAL_PERCENT = "30";
    private static final String SECOND_ACTUAL_COST = "50000";

    // Consolidado esperado, calculado a mano con las fórmulas del estándar:
    //   PV = 100000 x 50/100 + 200000 x 25/100 =  50000 +  50000 = 100000
    //   EV = 100000 x 40/100 + 200000 x 30/100 =  40000 +  60000 = 100000
    //   AC = 60000 + 50000                                       = 110000
    //   BAC = 100000 + 200000                                    = 300000
    //   CV = EV - AC = 100000 - 110000 = -10000       SV = EV - PV = 0
    //   CPI = 100000 / 110000 = 0,909090... -> 0,9091 (escala 4, HALF_UP)
    //   SPI = 100000 / 100000 = 1,0000
    //   EAC = BAC x AC / EV = 300000 x 110000 / 100000 = 330000    VAC = BAC - EAC = -30000
    private static final String EXPECTED_BUDGET = "300000.00";
    private static final String EXPECTED_PLANNED_VALUE = "100000.00";
    private static final String EXPECTED_EARNED_VALUE = "100000.00";
    private static final String EXPECTED_ACTUAL_COST = "110000.00";
    private static final String EXPECTED_COST_VARIANCE = "-10000.00";
    private static final String EXPECTED_SCHEDULE_VARIANCE = "0.00";
    private static final String EXPECTED_COST_INDEX = "0.9091";
    private static final String EXPECTED_SCHEDULE_INDEX = "1.0000";
    private static final String EXPECTED_ESTIMATE_AT_COMPLETION = "330000.00";
    private static final String EXPECTED_VARIANCE_AT_COMPLETION = "-30000.00";
    private static final String ZERO = "0";
    private static final int EXPECTED_ACTIVITY_COUNT = 2;
    private static final int NO_ACTIVITIES = 0;

    @Mock
    private ProjectRepositoryPort projectRepository;

    @Mock
    private ActivityRepositoryPort activityRepository;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, activityRepository, new EvmCalculator());
    }

    private static Project existingProject(final String name, final String description) {
        return new Project(PROJECT_ID, name, description, MANAGER, Instant.now(), Instant.now());
    }

    private static Project emptyProject() {
        return new Project(EMPTY_PROJECT_ID, EMPTY_PROJECT_NAME, null, null, Instant.now(), Instant.now());
    }

    private static Activity activity(
            final Long id,
            final Long projectId,
            final String budget,
            final String plannedPercent,
            final String actualPercent,
            final String actualCost) {
        return new Activity(
                id,
                projectId,
                "Actividad " + id,
                new ActivityFigures(
                        new BigDecimal(budget),
                        new BigDecimal(plannedPercent),
                        new BigDecimal(actualPercent),
                        new BigDecimal(actualCost)),
                ActivitySchedule.empty(),
                Instant.now(),
                Instant.now());
    }

    @Test
    @DisplayName("create guarda un proyecto nuevo construido con Project.create")
    void createSavesNewProject() {
        final Project saved = existingProject(NAME, DESCRIPTION);
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        final Project result = projectService.create(NAME, DESCRIPTION, MANAGER);

        assertThat(result).isEqualTo(saved);
        verify(projectRepository).save(argThat(project ->
                project.id() == null
                        && project.name().equals(NAME)
                        && project.description().equals(DESCRIPTION)
                        && project.manager().equals(MANAGER)));
    }

    @Test
    @DisplayName("update existente renombra el proyecto encontrado y lo guarda")
    void updateExistingProjectRenamesAndSaves() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        final Project renamed = existingProject(NEW_NAME, NEW_DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(renamed);

        final Project result = projectService.update(PROJECT_ID, NEW_NAME, NEW_DESCRIPTION, MANAGER);

        assertThat(result).isEqualTo(renamed);
    }

    @Test
    @DisplayName("update conserva el responsable y la identidad del proyecto actualizado")
    void updateKeepsManagerAndIdentity() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(existing);

        projectService.update(PROJECT_ID, NEW_NAME, NEW_DESCRIPTION, NEW_MANAGER);

        final ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        final Project sent = captor.getValue();
        assertThat(sent.manager()).isEqualTo(NEW_MANAGER);
        assertThat(sent.id()).isEqualTo(PROJECT_ID);
        assertThat(sent.createdAt()).isEqualTo(existing.createdAt());
        assertThat(sent.name()).isEqualTo(NEW_NAME);
    }

    @Test
    @DisplayName("update de un proyecto inexistente lanza ProjectNotFoundException")
    void updateMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.update(MISSING_PROJECT_ID, NEW_NAME, NEW_DESCRIPTION, MANAGER))
                .isInstanceOf(ProjectNotFoundException.class);
        verify(projectRepository, never()).save(any());
    }

    @Test
    @DisplayName("delete existente elimina el proyecto")
    void deleteExistingProjectDeletes() {
        when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);

        projectService.delete(PROJECT_ID);

        verify(projectRepository).deleteById(PROJECT_ID);
    }

    @Test
    @DisplayName("delete de un proyecto inexistente lanza ProjectNotFoundException y no borra nada")
    void deleteMissingProjectThrows() {
        when(projectRepository.existsById(MISSING_PROJECT_ID)).thenReturn(false);

        assertThatThrownBy(() -> projectService.delete(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
        verify(projectRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("get existente devuelve el proyecto encontrado")
    void getExistingProjectReturnsIt() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));

        final Project result = projectService.get(PROJECT_ID);

        assertThat(result).isEqualTo(existing);
    }

    @Test
    @DisplayName("get de un proyecto inexistente lanza ProjectNotFoundException")
    void getMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.get(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }

    @Test
    @DisplayName("list devuelve los proyectos sin tocar el repositorio de actividades")
    void listReturnsAllProjectsWithoutLoadingActivities() {
        final Project first = existingProject(NAME, DESCRIPTION);
        final Project second = emptyProject();
        when(projectRepository.findAll()).thenReturn(List.of(first, second));

        final List<Project> result = projectService.list();

        assertThat(result).containsExactly(first, second);
        verify(activityRepository, never()).findAllByProjectId(anyLong());
        verify(activityRepository, never()).findAllByProjectIdIn(anyCollection());
    }

    @Test
    @DisplayName("listWithIndicators consolida cada proyecto con una sola carga de actividades")
    void listWithIndicatorsConsolidatesInTwoQueries() {
        final Project withActivities = existingProject(NAME, DESCRIPTION);
        final Project empty = emptyProject();
        when(projectRepository.findAll()).thenReturn(List.of(withActivities, empty));
        when(activityRepository.findAllByProjectIdIn(anyCollection())).thenReturn(List.of(
                activity(1L, PROJECT_ID, FIRST_BUDGET, FIRST_PLANNED_PERCENT, FIRST_ACTUAL_PERCENT,
                        FIRST_ACTUAL_COST),
                activity(2L, PROJECT_ID, SECOND_BUDGET, SECOND_PLANNED_PERCENT, SECOND_ACTUAL_PERCENT,
                        SECOND_ACTUAL_COST)));

        final List<ProjectEvmSummary> result = projectService.listWithIndicators();

        final ProjectEvmSummary summary = result.getFirst();
        assertThat(summary.project()).isEqualTo(withActivities);
        assertThat(summary.activities()).hasSize(EXPECTED_ACTIVITY_COUNT);
        assertThat(summary.budgetAtCompletion()).isEqualByComparingTo(EXPECTED_BUDGET);
        assertThat(summary.indicators().plannedValue()).isEqualByComparingTo(EXPECTED_PLANNED_VALUE);
        assertThat(summary.indicators().earnedValue()).isEqualByComparingTo(EXPECTED_EARNED_VALUE);
        assertThat(summary.indicators().actualCost()).isEqualByComparingTo(EXPECTED_ACTUAL_COST);
        assertThat(summary.indicators().costVariance()).isEqualByComparingTo(EXPECTED_COST_VARIANCE);
        assertThat(summary.indicators().scheduleVariance()).isEqualByComparingTo(EXPECTED_SCHEDULE_VARIANCE);
        assertThat(summary.indicators().costPerformanceIndex()).isEqualByComparingTo(EXPECTED_COST_INDEX);
        assertThat(summary.indicators().schedulePerformanceIndex()).isEqualByComparingTo(EXPECTED_SCHEDULE_INDEX);
        assertThat(summary.indicators().estimateAtCompletion())
                .isEqualByComparingTo(EXPECTED_ESTIMATE_AT_COMPLETION);
        assertThat(summary.indicators().varianceAtCompletion())
                .isEqualByComparingTo(EXPECTED_VARIANCE_AT_COMPLETION);
        assertThat(summary.indicators().costStatus().status()).isEqualTo(PerformanceStatus.OVER_BUDGET);
        assertThat(summary.indicators().scheduleStatus().status()).isEqualTo(PerformanceStatus.ON_SCHEDULE);

        // La prueba del N+1: dos proyectos, una sola consulta de actividades y ninguna por proyecto.
        verify(activityRepository, times(1)).findAllByProjectIdIn(anyCollection());
        verify(activityRepository, never()).findAllByProjectId(anyLong());
    }

    @Test
    @DisplayName("listWithIndicators pide las actividades de todos los proyectos en un solo lote")
    void listWithIndicatorsAsksForEveryProjectIdAtOnce() {
        when(projectRepository.findAll()).thenReturn(List.of(existingProject(NAME, DESCRIPTION), emptyProject()));
        when(activityRepository.findAllByProjectIdIn(anyCollection())).thenReturn(List.of());

        projectService.listWithIndicators();

        verify(activityRepository).findAllByProjectIdIn(eq(List.of(PROJECT_ID, EMPTY_PROJECT_ID)));
    }

    @Test
    @DisplayName("listWithIndicators devuelve un proyecto sin actividades con sumas en cero e índices nulos")
    void listWithIndicatorsHandlesProjectWithoutActivities() {
        when(projectRepository.findAll()).thenReturn(List.of(emptyProject()));
        when(activityRepository.findAllByProjectIdIn(anyCollection())).thenReturn(List.of());

        final ProjectEvmSummary summary = projectService.listWithIndicators().getFirst();

        assertThat(summary.activities()).hasSize(NO_ACTIVITIES);
        assertThat(summary.budgetAtCompletion()).isEqualByComparingTo(ZERO);
        assertThat(summary.indicators().plannedValue()).isEqualByComparingTo(ZERO);
        assertThat(summary.indicators().earnedValue()).isEqualByComparingTo(ZERO);
        assertThat(summary.indicators().actualCost()).isEqualByComparingTo(ZERO);
        assertThat(summary.indicators().costPerformanceIndex()).isNull();
        assertThat(summary.indicators().schedulePerformanceIndex()).isNull();
        assertThat(summary.indicators().costStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
        assertThat(summary.indicators().scheduleStatus().status()).isEqualTo(PerformanceStatus.NOT_APPLICABLE);
    }

    @Test
    @DisplayName("listWithIndicators sin proyectos no consulta actividades")
    void listWithIndicatorsWithoutProjectsSkipsActivityQuery() {
        when(projectRepository.findAll()).thenReturn(List.of());

        assertThat(projectService.listWithIndicators()).isEmpty();
        verify(activityRepository, never()).findAllByProjectIdIn(anyCollection());
    }

    @Test
    @DisplayName("update busca el proyecto por id antes de guardar")
    void updateFindsProjectById() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(existing);

        projectService.update(PROJECT_ID, NEW_NAME, NEW_DESCRIPTION, MANAGER);

        verify(projectRepository).findById(eq(PROJECT_ID));
    }
}
