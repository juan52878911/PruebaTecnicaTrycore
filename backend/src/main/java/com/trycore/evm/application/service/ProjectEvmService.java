package com.trycore.evm.application.service;

import com.trycore.evm.application.port.in.ProjectEvmUseCase;
import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.EstimateFormula;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;
import com.trycore.evm.domain.service.EvmCalculator;

/**
 * Implementación del caso de uso de análisis de Valor Ganado de un proyecto. Clase plana sin
 * anotaciones de framework: el cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 */
public final class ProjectEvmService implements ProjectEvmUseCase {

    private final ProjectRepositoryPort projectRepository;
    private final ActivityRepositoryPort activityRepository;
    private final EvmCalculator evmCalculator;

    public ProjectEvmService(
            final ProjectRepositoryPort projectRepository,
            final ActivityRepositoryPort activityRepository,
            final EvmCalculator evmCalculator) {
        this.projectRepository = projectRepository;
        this.activityRepository = activityRepository;
        this.evmCalculator = evmCalculator;
    }

    @Override
    public ProjectEvmSummary analyze(final Long projectId) {
        return analyze(projectId, null);
    }

    @Override
    public ProjectEvmSummary analyze(final Long projectId, final EstimateFormula formula) {
        final Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));
        final var activities = activityRepository.findAllByProjectId(projectId);
        return formula == null
                ? evmCalculator.consolidate(project, activities)
                : evmCalculator.consolidate(project, activities, formula);
    }
}
