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
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;
import com.trycore.evm.domain.service.EvmCalculator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas de {@link ProjectEvmService} con dobles de los puertos de salida y del calculador de
 * Valor Ganado, sin infraestructura real.
 */
@ExtendWith(MockitoExtension.class)
class ProjectEvmServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final Long ACTIVITY_ID = 10L;

    @Mock
    private ProjectRepositoryPort projectRepository;

    @Mock
    private ActivityRepositoryPort activityRepository;

    @Mock
    private EvmCalculator evmCalculator;

    private ProjectEvmService projectEvmService;

    @BeforeEach
    void setUp() {
        projectEvmService = new ProjectEvmService(projectRepository, activityRepository, evmCalculator);
    }

    private static Project existingProject() {
        return new Project(PROJECT_ID, "Plataforma de pagos", "Descripción", Instant.now(), Instant.now());
    }

    private static Activity activity() {
        final ActivityFigures figures = new ActivityFigures(
                new BigDecimal("100000"), new BigDecimal("50"), new BigDecimal("40"), new BigDecimal("60000"));
        return new Activity(ACTIVITY_ID, PROJECT_ID, "Diseño de arquitectura", figures, Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("analyze delega en EvmCalculator.consolidate con el proyecto y sus actividades")
    void analyzeDelegatesToEvmCalculatorWithProjectActivities() {
        final Project project = existingProject();
        final List<Activity> activities = List.of(activity());
        final ProjectEvmSummary expectedSummary =
                new ProjectEvmSummary(project, BigDecimal.ZERO, null, List.of());
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(project));
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(activities);
        when(evmCalculator.consolidate(project, activities)).thenReturn(expectedSummary);

        final ProjectEvmSummary result = projectEvmService.analyze(PROJECT_ID);

        assertThat(result).isSameAs(expectedSummary);
        verify(evmCalculator).consolidate(project, activities);
    }

    @Test
    @DisplayName("analyze de un proyecto inexistente lanza ProjectNotFoundException")
    void analyzeMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectEvmService.analyze(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}
