package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.ProjectEvmSummaryResponse;
import com.trycore.evm.domain.model.ProjectEvmSummary;

/**
 * Traducción explícita del análisis de Valor Ganado del proyecto a su representación REST, sin
 * librerías de mapeo.
 */
public final class ProjectEvmSummaryRestMapper {

    private ProjectEvmSummaryRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ProjectEvmSummaryResponse toResponse(final ProjectEvmSummary summary) {
        return new ProjectEvmSummaryResponse(
                ProjectRestMapper.toResponse(summary.project()),
                summary.budgetAtCompletion(),
                EvmIndicatorsRestMapper.toResponse(summary.indicators()),
                summary.activities().stream().map(ActivityRestMapper::toResponse).toList());
    }
}
