package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.ProjectResponse;
import com.trycore.evm.domain.model.Project;

/** Traducción explícita del proyecto de dominio a su representación REST, sin librerías de mapeo. */
public final class ProjectRestMapper {

    private ProjectRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ProjectResponse toResponse(final Project project) {
        return new ProjectResponse(
                project.id(), project.name(), project.description(), project.createdAt(), project.updatedAt());
    }
}
