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
import com.trycore.evm.domain.exception.ActivityNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pruebas de {@link ActivityService} con dobles de los puertos de salida, sin infraestructura real. */
@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final Long ACTIVITY_ID = 10L;
    private static final Long MISSING_ACTIVITY_ID = 999L;
    private static final String NAME = "Diseño de arquitectura";
    private static final String NEW_NAME = "Diseño de arquitectura revisado";

    @Mock
    private ActivityRepositoryPort activityRepository;

    @Mock
    private ProjectRepositoryPort projectRepository;

    private ActivityService activityService;

    @BeforeEach
    void setUp() {
        activityService = new ActivityService(activityRepository, projectRepository);
    }

    private static ActivityFigures figures() {
        return new ActivityFigures(
                new BigDecimal("100000"), new BigDecimal("50"), new BigDecimal("40"), new BigDecimal("60000"));
    }

    private static Activity existingActivity(final String name) {
        return new Activity(ACTIVITY_ID, PROJECT_ID, name, figures(), Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("create en un proyecto existente guarda la actividad construida con Activity.create")
    void createInExistingProjectSaves() {
        when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);
        final Activity saved = existingActivity(NAME);
        when(activityRepository.save(any(Activity.class))).thenReturn(saved);

        final Activity result = activityService.create(PROJECT_ID, NAME, figures());

        assertThat(result).isEqualTo(saved);
    }

    @Test
    @DisplayName("create en un proyecto inexistente lanza ProjectNotFoundException y no guarda")
    void createInMissingProjectThrows() {
        when(projectRepository.existsById(MISSING_PROJECT_ID)).thenReturn(false);

        assertThatThrownBy(() -> activityService.create(MISSING_PROJECT_ID, NAME, figures()))
                .isInstanceOf(ProjectNotFoundException.class);
        verify(activityRepository, never()).save(any());
    }

    @Test
    @DisplayName("update de una actividad existente en el proyecto la guarda actualizada")
    void updateExistingActivitySaves() {
        final Activity existing = existingActivity(NAME);
        final Activity updated = existingActivity(NEW_NAME);
        when(activityRepository.findByIdAndProjectId(ACTIVITY_ID, PROJECT_ID)).thenReturn(Optional.of(existing));
        when(activityRepository.save(any(Activity.class))).thenReturn(updated);

        final Activity result = activityService.update(PROJECT_ID, ACTIVITY_ID, NEW_NAME, figures());

        assertThat(result).isEqualTo(updated);
    }

    @Test
    @DisplayName("update de una actividad que no existe en el proyecto lanza ActivityNotFoundException")
    void updateMissingActivityThrows() {
        when(activityRepository.findByIdAndProjectId(MISSING_ACTIVITY_ID, PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> activityService.update(PROJECT_ID, MISSING_ACTIVITY_ID, NEW_NAME, figures()))
                .isInstanceOf(ActivityNotFoundException.class);
        verify(activityRepository, never()).save(any());
    }

    @Test
    @DisplayName("delete de una actividad existente en el proyecto la elimina")
    void deleteExistingActivityDeletes() {
        final Activity existing = existingActivity(NAME);
        when(activityRepository.findByIdAndProjectId(ACTIVITY_ID, PROJECT_ID)).thenReturn(Optional.of(existing));

        activityService.delete(PROJECT_ID, ACTIVITY_ID);

        verify(activityRepository).deleteById(ACTIVITY_ID);
    }

    @Test
    @DisplayName("delete de una actividad que no existe en el proyecto lanza ActivityNotFoundException")
    void deleteMissingActivityThrows() {
        when(activityRepository.findByIdAndProjectId(MISSING_ACTIVITY_ID, PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> activityService.delete(PROJECT_ID, MISSING_ACTIVITY_ID))
                .isInstanceOf(ActivityNotFoundException.class);
        verify(activityRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("listByProject en un proyecto existente devuelve sus actividades")
    void listByProjectInExistingProjectReturnsActivities() {
        when(projectRepository.existsById(PROJECT_ID)).thenReturn(true);
        final Activity activity = existingActivity(NAME);
        when(activityRepository.findAllByProjectId(PROJECT_ID)).thenReturn(List.of(activity));

        final List<Activity> result = activityService.listByProject(PROJECT_ID);

        assertThat(result).containsExactly(activity);
    }

    @Test
    @DisplayName("listByProject en un proyecto inexistente lanza ProjectNotFoundException")
    void listByProjectInMissingProjectThrows() {
        when(projectRepository.existsById(MISSING_PROJECT_ID)).thenReturn(false);

        assertThatThrownBy(() -> activityService.listByProject(MISSING_PROJECT_ID))
                .isInstanceOf(ProjectNotFoundException.class);
    }
}
