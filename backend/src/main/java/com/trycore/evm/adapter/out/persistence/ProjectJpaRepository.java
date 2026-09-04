package com.trycore.evm.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/** Repositorio Spring Data JPA de proyectos. Uso exclusivo de {@link ProjectPersistenceAdapter}. */
interface ProjectJpaRepository extends JpaRepository<ProjectJpaEntity, Long> {
}
