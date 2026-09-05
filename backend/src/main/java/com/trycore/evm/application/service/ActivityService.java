package com.trycore.evm.application.service;

import java.util.List;

import com.trycore.evm.application.port.in.ActivityUseCases;
import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ActivityNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.ProgressMeasurement;
import com.trycore.evm.domain.service.EvmCalculator;

/**
 * Implementación de los casos de uso de actividades. Clase plana sin anotaciones de framework: el
 * cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 */
public final class ActivityService implements ActivityUseCases {

    private final ActivityRepositoryPort activityRepository;
    private final ProjectRepositoryPort projectRepository;
    private final EvmCalculator evmCalculator;

    public ActivityService(
            final ActivityRepositoryPort activityRepository,
            final ProjectRepositoryPort projectRepository,
            final EvmCalculator evmCalculator) {
        this.activityRepository = activityRepository;
        this.projectRepository = projectRepository;
        this.evmCalculator = evmCalculator;
    }

    @Override
    public ActivityEvm create(
            final Long projectId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule,
            final ProgressMeasurement progress) {
        requireProjectExists(projectId);
        return withIndicators(
                activityRepository.save(Activity.create(projectId, name, figures, schedule, progress)));
    }

    @Override
    public ActivityEvm update(
            final Long projectId,
            final Long activityId,
            final String name,
            final ActivityFigures figures,
            final ActivitySchedule schedule,
            final ProgressMeasurement progress) {
        final Activity existing = findActivity(projectId, activityId);
        return withIndicators(activityRepository.save(existing.update(name, figures, schedule, progress)));
    }

    @Override
    public void delete(final Long projectId, final Long activityId) {
        findActivity(projectId, activityId);
        activityRepository.deleteById(activityId);
    }

    @Override
    public ActivityEvm get(final Long projectId, final Long activityId) {
        return withIndicators(findActivity(projectId, activityId));
    }

    @Override
    public List<ActivityEvm> listByProject(final Long projectId) {
        requireProjectExists(projectId);
        return activityRepository.findAllByProjectId(projectId).stream().map(this::withIndicators).toList();
    }

    private ActivityEvm withIndicators(final Activity activity) {
        return evmCalculator.evaluate(activity);
    }

    private void requireProjectExists(final Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ProjectNotFoundException(projectId);
        }
    }

    private Activity findActivity(final Long projectId, final Long activityId) {
        return activityRepository.findByIdAndProjectId(activityId, projectId)
                .orElseThrow(() -> new ActivityNotFoundException(projectId, activityId));
    }
}
