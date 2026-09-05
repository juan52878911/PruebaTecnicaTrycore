package com.trycore.evm.application.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.trycore.evm.application.port.in.ProjectUseCases;
import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;
import com.trycore.evm.domain.service.EvmCalculator;

/**
 * Implementación de los casos de uso de proyectos. Clase plana sin anotaciones de framework: el
 * cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 */
public final class ProjectService implements ProjectUseCases {

    private final ProjectRepositoryPort projectRepository;
    private final ActivityRepositoryPort activityRepository;
    private final EvmCalculator evmCalculator;

    public ProjectService(
            final ProjectRepositoryPort projectRepository,
            final ActivityRepositoryPort activityRepository,
            final EvmCalculator evmCalculator) {
        this.projectRepository = projectRepository;
        this.activityRepository = activityRepository;
        this.evmCalculator = evmCalculator;
    }

    @Override
    public Project create(final String name, final String description, final String manager) {
        return projectRepository.save(Project.create(name, description, manager));
    }

    @Override
    public Project update(final Long id, final String name, final String description, final String manager) {
        final Project existing = get(id);
        return projectRepository.save(existing.rename(name, description, manager));
    }

    @Override
    public void delete(final Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ProjectNotFoundException(id);
        }
        projectRepository.deleteById(id);
    }

    @Override
    public Project get(final Long id) {
        return projectRepository.findById(id).orElseThrow(() -> new ProjectNotFoundException(id));
    }

    @Override
    public List<Project> list() {
        return projectRepository.findAll();
    }

    @Override
    public List<ProjectEvmSummary> listWithIndicators() {
        final List<Project> projects = projectRepository.findAll();
        if (projects.isEmpty()) {
            return List.of();
        }
        final Map<Long, List<Activity>> activitiesByProject = activitiesOf(projects);
        return projects.stream()
                .map(project -> evmCalculator.consolidate(
                        project, activitiesByProject.getOrDefault(project.id(), List.of())))
                .toList();
    }

    /**
     * Carga en una sola consulta las actividades de todos los proyectos y las agrupa por
     * proyecto. Es lo que mantiene el listado en dos consultas en total: una de proyectos y una
     * de actividades, sin importar cuántos proyectos haya. Un proyecto sin actividades
     * sencillamente no aparece en el mapa y consolida sobre una lista vacía.
     */
    private Map<Long, List<Activity>> activitiesOf(final List<Project> projects) {
        final List<Long> projectIds = projects.stream().map(Project::id).toList();
        return activityRepository.findAllByProjectIdIn(projectIds).stream()
                .collect(Collectors.groupingBy(Activity::projectId));
    }
}
