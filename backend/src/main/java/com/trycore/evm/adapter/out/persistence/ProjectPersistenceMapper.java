package com.trycore.evm.adapter.out.persistence;

import com.trycore.evm.domain.model.Project;

/** Traducción explícita entre {@link Project} y {@link ProjectJpaEntity}, sin librerías de mapeo. */
final class ProjectPersistenceMapper {

    private ProjectPersistenceMapper() {
        // Utilidad estática, no instanciable.
    }

    static Project toDomain(final ProjectJpaEntity entity) {
        return new Project(
                entity.getId(), entity.getName(), entity.getDescription(), entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    /** Copia el nombre y la descripción del proyecto de dominio a la entidad, para crear o actualizar. */
    static void copyForSave(final Project project, final ProjectJpaEntity entity) {
        entity.setName(project.name());
        entity.setDescription(project.description());
    }
}
