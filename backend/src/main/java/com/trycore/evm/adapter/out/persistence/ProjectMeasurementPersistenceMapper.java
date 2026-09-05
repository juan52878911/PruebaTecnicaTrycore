package com.trycore.evm.adapter.out.persistence;

import java.util.List;

import com.trycore.evm.domain.model.ActivityMeasurement;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.ProjectMeasurement;

/**
 * Traducción explícita entre {@link ProjectMeasurement} y sus entidades JPA, sin librerías de
 * mapeo. Las cuatro cifras se copian una a una en las dos tablas, que comparten esa forma.
 */
final class ProjectMeasurementPersistenceMapper {

    private ProjectMeasurementPersistenceMapper() {
        // Utilidad estática, no instanciable.
    }

    static ProjectMeasurement toDomain(final ProjectMeasurementJpaEntity entity) {
        final List<ActivityMeasurement> activities = entity.getActivities().stream()
                .map(ProjectMeasurementPersistenceMapper::toDomain)
                .toList();
        return new ProjectMeasurement(
                entity.getId(),
                entity.getProjectId(),
                entity.getCutoffDate(),
                entity.getNotes(),
                new EvmTotals(
                        entity.getBudgetAtCompletion(), entity.getPlannedValue(),
                        entity.getEarnedValue(), entity.getActualCost()),
                activities,
                entity.getCreatedAt());
    }

    /** Construye la entidad completa del corte, con sus líneas ya enlazadas para guardarse en cascada. */
    static ProjectMeasurementJpaEntity toEntity(final ProjectMeasurement measurement) {
        final ProjectMeasurementJpaEntity entity = new ProjectMeasurementJpaEntity();
        entity.setProjectId(measurement.projectId());
        entity.setCutoffDate(measurement.cutoffDate());
        entity.setNotes(measurement.notes());
        final EvmTotals totals = measurement.totals();
        entity.setBudgetAtCompletion(totals.budgetAtCompletion());
        entity.setPlannedValue(totals.plannedValue());
        entity.setEarnedValue(totals.earnedValue());
        entity.setActualCost(totals.actualCost());
        measurement.activities().stream()
                .map(ProjectMeasurementPersistenceMapper::toEntity)
                .forEach(entity::addActivity);
        return entity;
    }

    private static ActivityMeasurement toDomain(final ProjectMeasurementActivityJpaEntity entity) {
        return new ActivityMeasurement(
                entity.getActivityId(),
                entity.getActivityName(),
                new EvmTotals(
                        entity.getBudgetAtCompletion(), entity.getPlannedValue(),
                        entity.getEarnedValue(), entity.getActualCost()));
    }

    private static ProjectMeasurementActivityJpaEntity toEntity(final ActivityMeasurement activityMeasurement) {
        final ProjectMeasurementActivityJpaEntity entity = new ProjectMeasurementActivityJpaEntity();
        entity.setActivityId(activityMeasurement.activityId());
        entity.setActivityName(activityMeasurement.activityName());
        final EvmTotals totals = activityMeasurement.totals();
        entity.setBudgetAtCompletion(totals.budgetAtCompletion());
        entity.setPlannedValue(totals.plannedValue());
        entity.setEarnedValue(totals.earnedValue());
        entity.setActualCost(totals.actualCost());
        return entity;
    }
}
