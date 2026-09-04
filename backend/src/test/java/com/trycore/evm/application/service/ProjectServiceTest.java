package com.trycore.evm.application.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Pruebas de {@link ProjectService} con un doble del puerto de salida, sin infraestructura real. */
@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final Long PROJECT_ID = 1L;
    private static final Long MISSING_PROJECT_ID = 99L;
    private static final String NAME = "Plataforma de pagos";
    private static final String DESCRIPTION = "Proyecto de demostración";
    private static final String NEW_NAME = "Plataforma de pagos v2";
    private static final String NEW_DESCRIPTION = "Descripción actualizada";

    @Mock
    private ProjectRepositoryPort projectRepository;

    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository);
    }

    private static Project existingProject(final String name, final String description) {
        return new Project(PROJECT_ID, name, description, Instant.now(), Instant.now());
    }

    @Test
    @DisplayName("create guarda un proyecto nuevo construido con Project.create")
    void createSavesNewProject() {
        final Project saved = existingProject(NAME, DESCRIPTION);
        when(projectRepository.save(any(Project.class))).thenReturn(saved);

        final Project result = projectService.create(NAME, DESCRIPTION);

        assertThat(result).isEqualTo(saved);
        verify(projectRepository).save(argThatCreatedProjectMatches());
    }

    private static Project argThatCreatedProjectMatches() {
        return argThat(project ->
                project.id() == null && project.name().equals(NAME) && project.description().equals(DESCRIPTION));
    }

    @Test
    @DisplayName("update existente renombra el proyecto encontrado y lo guarda")
    void updateExistingProjectRenamesAndSaves() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        final Project renamed = existingProject(NEW_NAME, NEW_DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(renamed);

        final Project result = projectService.update(PROJECT_ID, NEW_NAME, NEW_DESCRIPTION);

        assertThat(result).isEqualTo(renamed);
    }

    @Test
    @DisplayName("update de un proyecto inexistente lanza ProjectNotFoundException")
    void updateMissingProjectThrows() {
        when(projectRepository.findById(MISSING_PROJECT_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.update(MISSING_PROJECT_ID, NEW_NAME, NEW_DESCRIPTION))
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
    @DisplayName("list devuelve todos los proyectos del repositorio")
    void listReturnsAllProjects() {
        final Project first = existingProject(NAME, DESCRIPTION);
        final Project second = new Project(2L, "Otro proyecto", null, Instant.now(), Instant.now());
        when(projectRepository.findAll()).thenReturn(List.of(first, second));

        final List<Project> result = projectService.list();

        assertThat(result).containsExactly(first, second);
    }

    @Test
    @DisplayName("update busca el proyecto por id antes de guardar")
    void updateFindsProjectById() {
        final Project existing = existingProject(NAME, DESCRIPTION);
        when(projectRepository.findById(PROJECT_ID)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenReturn(existing);

        projectService.update(PROJECT_ID, NEW_NAME, NEW_DESCRIPTION);

        verify(projectRepository).findById(eq(PROJECT_ID));
    }
}
