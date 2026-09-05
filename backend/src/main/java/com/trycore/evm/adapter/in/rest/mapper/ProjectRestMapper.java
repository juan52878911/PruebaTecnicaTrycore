package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.EvmTotalsResponse;
import com.trycore.evm.adapter.in.rest.dto.ProjectResponse;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;

/** Traducción explícita del proyecto de dominio a su representación REST, sin librerías de mapeo. */
public final class ProjectRestMapper {

    private ProjectRestMapper() {
        // Utilidad estática, no instanciable.
    }

    /** Proyecto sin cifras derivadas: es la forma histórica de la respuesta y no debe cambiar. */
    public static ProjectResponse toResponse(final Project project) {
        return new ProjectResponse(
                project.id(),
                project.name(),
                project.description(),
                project.manager(),
                project.createdAt(),
                project.updatedAt(),
                null,
                null,
                null);
    }

    /**
     * Proyecto con el contador de actividades, las sumas y los indicadores consolidados. Las
     * cifras salen del mismo consolidado que devuelve {@code GET /projects/{id}/evm}, así que una
     * fila del listado y el detalle del proyecto no pueden discrepar.
     */
    public static ProjectResponse toResponse(final ProjectEvmSummary summary) {
        final Project project = summary.project();
        final EvmIndicators indicators = summary.indicators();
        return new ProjectResponse(
                project.id(),
                project.name(),
                project.description(),
                project.manager(),
                project.createdAt(),
                project.updatedAt(),
                summary.activities().size(),
                new EvmTotalsResponse(
                        summary.budgetAtCompletion(),
                        indicators.plannedValue(),
                        indicators.earnedValue(),
                        indicators.actualCost()),
                EvmIndicatorsRestMapper.toResponse(indicators));
    }
}
