package com.trycore.evm.application.service;

import java.util.List;

import com.trycore.evm.application.port.in.ActivityUseCases;
import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.ActivityNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;

/**
 * Implementación de los casos de uso de actividades. Clase plana sin anotaciones de framework: el
 * cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 */
public final class ActivityService implements ActivityUseCases {

    private final ActivityRepositoryPort activityRepository;
    private final ProjectRepositoryPort projectRepository;

    public ActivityService(
            final ActivityRepositoryPort activityRepository, final ProjectRepositoryPort projectRepository) {
        this.activityRepository = activityRepository;
        this.projectRepository = projectRepository;
    }

    @Override
    public Activity create(final Long projectId, final String name, final ActivityFigures figures) {
        requireProjectExists(projectId);
        return activityRepository.save(Activity.create(projectId, name, figures));
    }

    @Override
    public Activity update(
            final Long projectId, final Long activityId, final String name, final ActivityFigures figures) {
        final Activity existing = findActivity(projectId, activityId);
        return activityRepository.save(existing.update(name, figures));
    }

    @Override
    public void delete(final Long projectId, final Long activityId) {
        findActivity(projectId, activityId);
        activityRepository.deleteById(activityId);
    }

    @Override
    public List<Activity> listByProject(final Long projectId) {
        requireProjectExists(projectId);
        return activityRepository.findAllByProjectId(projectId);
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
