package com.trycore.evm.adapter.out.persistence;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio Spring Data JPA del histórico. Uso exclusivo de
 * {@link ProjectMeasurementPersistenceAdapter}.
 *
 * <p>Las lecturas traen las líneas por actividad en la misma consulta: un corte sin ellas está
 * incompleto y cargarlas después daría una consulta por medición al construir la serie temporal.
 */
interface ProjectMeasurementJpaRepository extends JpaRepository<ProjectMeasurementJpaEntity, Long> {

    @EntityGraph(attributePaths = "activities")
    Optional<ProjectMeasurementJpaEntity> findByIdAndProjectId(Long id, Long projectId);

    @EntityGraph(attributePaths = "activities")
    List<ProjectMeasurementJpaEntity> findAllByProjectIdOrderByCutoffDateAsc(Long projectId);

    boolean existsByProjectIdAndCutoffDate(Long projectId, LocalDate cutoffDate);
}
