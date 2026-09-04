package com.trycore.evm.adapter.out.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Project;

/**
 * Adaptador de persistencia de proyectos: implementa el puerto de salida sobre Spring Data JPA.
 * Las fechas de creación y modificación las gestiona {@link ProjectJpaEntity}, nunca el dominio.
 */
@Repository
@Transactional
public class ProjectPersistenceAdapter implements ProjectRepositoryPort {

    private final ProjectJpaRepository projectJpaRepository;

    public ProjectPersistenceAdapter(final ProjectJpaRepository projectJpaRepository) {
        this.projectJpaRepository = projectJpaRepository;
    }

    @Override
    public Project save(final Project project) {
        final ProjectJpaEntity entity = project.id() == null
                ? new ProjectJpaEntity()
                : findEntityOrThrow(project.id());
        ProjectPersistenceMapper.copyForSave(project, entity);
        return ProjectPersistenceMapper.toDomain(projectJpaRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Project> findById(final Long id) {
        return projectJpaRepository.findById(id).map(ProjectPersistenceMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Project> findAll() {
        return projectJpaRepository.findAll().stream().map(ProjectPersistenceMapper::toDomain).toList();
    }

    @Override
    public void deleteById(final Long id) {
        projectJpaRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsById(final Long id) {
        return projectJpaRepository.existsById(id);
    }

    private ProjectJpaEntity findEntityOrThrow(final Long id) {
        return projectJpaRepository.findById(id).orElseThrow(() -> new ProjectNotFoundException(id));
    }
}
