package com.trycore.evm.application.service;

import java.util.List;

import com.trycore.evm.application.port.in.ProjectUseCases;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Project;

/**
 * Implementación de los casos de uso de proyectos. Clase plana sin anotaciones de framework: el
 * cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 */
public final class ProjectService implements ProjectUseCases {

    private final ProjectRepositoryPort projectRepository;

    public ProjectService(final ProjectRepositoryPort projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Override
    public Project create(final String name, final String description) {
        return projectRepository.save(Project.create(name, description));
    }

    @Override
    public Project update(final Long id, final String name, final String description) {
        final Project existing = get(id);
        return projectRepository.save(existing.rename(name, description));
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
}
