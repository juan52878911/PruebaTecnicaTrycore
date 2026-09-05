package com.trycore.evm.adapter.out.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.trycore.evm.application.port.out.ProjectMeasurementRepositoryPort;
import com.trycore.evm.domain.model.ProjectMeasurement;

/**
 * Adaptador de persistencia del histórico: implementa el puerto de salida sobre Spring Data JPA.
 * La fecha de registro la gestiona {@link ProjectMeasurementJpaEntity}, nunca el dominio.
 *
 * <p>{@code save} siempre inserta un corte nuevo con sus líneas: el histórico es inmutable y no
 * existe ningún caso de uso que actualice una medición ya tomada.
 */
@Repository
@Transactional
public class ProjectMeasurementPersistenceAdapter implements ProjectMeasurementRepositoryPort {

    private final ProjectMeasurementJpaRepository measurementJpaRepository;

    public ProjectMeasurementPersistenceAdapter(final ProjectMeasurementJpaRepository measurementJpaRepository) {
        this.measurementJpaRepository = measurementJpaRepository;
    }

    @Override
    public ProjectMeasurement save(final ProjectMeasurement measurement) {
        final ProjectMeasurementJpaEntity saved =
                measurementJpaRepository.save(ProjectMeasurementPersistenceMapper.toEntity(measurement));
        return ProjectMeasurementPersistenceMapper.toDomain(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ProjectMeasurement> findByIdAndProjectId(final Long id, final Long projectId) {
        return measurementJpaRepository.findByIdAndProjectId(id, projectId)
                .map(ProjectMeasurementPersistenceMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectMeasurement> findAllByProjectId(final Long projectId) {
        return measurementJpaRepository.findAllByProjectIdOrderByCutoffDateAsc(projectId).stream()
                .map(ProjectMeasurementPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByProjectIdAndCutoffDate(final Long projectId, final LocalDate cutoffDate) {
        return measurementJpaRepository.existsByProjectIdAndCutoffDate(projectId, cutoffDate);
    }

    @Override
    public void deleteById(final Long id) {
        measurementJpaRepository.deleteById(id);
    }
}
