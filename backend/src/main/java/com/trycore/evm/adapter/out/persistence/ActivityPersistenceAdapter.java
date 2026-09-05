package com.trycore.evm.adapter.out.persistence;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.domain.exception.ActivityNotFoundException;
import com.trycore.evm.domain.model.Activity;

/**
 * Adaptador de persistencia de actividades: implementa el puerto de salida sobre Spring Data JPA.
 * Las fechas de creación y modificación las gestiona {@link ActivityJpaEntity}, nunca el dominio.
 */
@Repository
@Transactional
public class ActivityPersistenceAdapter implements ActivityRepositoryPort {

    private final ActivityJpaRepository activityJpaRepository;

    public ActivityPersistenceAdapter(final ActivityJpaRepository activityJpaRepository) {
        this.activityJpaRepository = activityJpaRepository;
    }

    @Override
    public Activity save(final Activity activity) {
        final ActivityJpaEntity entity = activity.id() == null
                ? new ActivityJpaEntity()
                : findEntityOrThrow(activity.projectId(), activity.id());
        ActivityPersistenceMapper.copyForSave(activity, entity);
        return ActivityPersistenceMapper.toDomain(activityJpaRepository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Activity> findByIdAndProjectId(final Long id, final Long projectId) {
        return activityJpaRepository.findByIdAndProjectId(id, projectId).map(ActivityPersistenceMapper::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Activity> findAllByProjectId(final Long projectId) {
        return activityJpaRepository.findAllByProjectId(projectId).stream()
                .map(ActivityPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Activity> findAllByProjectIdIn(final Collection<Long> projectIds) {
        // Con la colección vacía no hay nada que preguntar: una consulta con IN () no devolvería
        // filas y sí gastaría un viaje a la base de datos.
        if (projectIds.isEmpty()) {
            return List.of();
        }
        return activityJpaRepository.findAllByProjectIdIn(projectIds).stream()
                .map(ActivityPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public void deleteById(final Long id) {
        activityJpaRepository.deleteById(id);
    }

    private ActivityJpaEntity findEntityOrThrow(final Long projectId, final Long id) {
        return activityJpaRepository.findByIdAndProjectId(id, projectId)
                .orElseThrow(() -> new ActivityNotFoundException(projectId, id));
    }
}
