package com.trycore.evm.adapter.out.persistence;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;

/** Traducción explícita entre {@link Activity} y {@link ActivityJpaEntity}, sin librerías de mapeo. */
final class ActivityPersistenceMapper {

    private ActivityPersistenceMapper() {
        // Utilidad estática, no instanciable.
    }

    static Activity toDomain(final ActivityJpaEntity entity) {
        final ActivityFigures figures = new ActivityFigures(
                entity.getBudgetAtCompletion(), entity.getPlannedProgressPercent(),
                entity.getActualProgressPercent(), entity.getActualCost());
        return new Activity(
                entity.getId(), entity.getProjectId(), entity.getName(), figures, entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    /** Copia el proyecto, nombre y cifras de la actividad de dominio a la entidad, para crear o actualizar. */
    static void copyForSave(final Activity activity, final ActivityJpaEntity entity) {
        entity.setProjectId(activity.projectId());
        entity.setName(activity.name());
        final ActivityFigures figures = activity.figures();
        entity.setBudgetAtCompletion(figures.budgetAtCompletion());
        entity.setPlannedProgressPercent(figures.plannedProgressPercent());
        entity.setActualProgressPercent(figures.actualProgressPercent());
        entity.setActualCost(figures.actualCost());
    }
}
