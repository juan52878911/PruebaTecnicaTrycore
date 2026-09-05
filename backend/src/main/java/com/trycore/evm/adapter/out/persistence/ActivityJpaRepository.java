package com.trycore.evm.adapter.out.persistence;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio Spring Data JPA de actividades. Uso exclusivo de {@link ActivityPersistenceAdapter}. */
interface ActivityJpaRepository extends JpaRepository<ActivityJpaEntity, Long> {

    Optional<ActivityJpaEntity> findByIdAndProjectId(Long id, Long projectId);

    List<ActivityJpaEntity> findAllByProjectId(Long projectId);

    List<ActivityJpaEntity> findAllByProjectIdIn(Collection<Long> projectIds);
}
