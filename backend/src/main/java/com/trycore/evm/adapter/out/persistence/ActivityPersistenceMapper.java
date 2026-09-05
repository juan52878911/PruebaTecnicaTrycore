package com.trycore.evm.adapter.out.persistence;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.MeasurementMethod;
import com.trycore.evm.domain.model.ProgressMeasurement;

/** Traducción explícita entre {@link Activity} y {@link ActivityJpaEntity}, sin librerías de mapeo. */
final class ActivityPersistenceMapper {

    private ActivityPersistenceMapper() {
        // Utilidad estática, no instanciable.
    }

    static Activity toDomain(final ActivityJpaEntity entity) {
        final ActivityFigures figures = new ActivityFigures(
                entity.getBudgetAtCompletion(), entity.getPlannedProgressPercent(),
                entity.getActualProgressPercent(), entity.getActualCost());
        final ActivitySchedule schedule = new ActivitySchedule(
                entity.getPlannedStartDate(), entity.getPlannedEndDate(),
                entity.getActualStartDate(), entity.getActualEndDate());
        final ProgressMeasurement progress = new ProgressMeasurement(
                MeasurementMethod.valueOf(entity.getMeasurementMethod()));
        return new Activity(
                entity.getId(), entity.getProjectId(), entity.getName(), figures, schedule, progress,
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    /** Copia proyecto, nombre, cifras y fechas de la actividad de dominio a la entidad, para crear o actualizar. */
    static void copyForSave(final Activity activity, final ActivityJpaEntity entity) {
        entity.setProjectId(activity.projectId());
        entity.setName(activity.name());
        final ActivityFigures figures = activity.figures();
        entity.setBudgetAtCompletion(figures.budgetAtCompletion());
        entity.setPlannedProgressPercent(figures.plannedProgressPercent());
        entity.setActualProgressPercent(figures.actualProgressPercent());
        entity.setActualCost(figures.actualCost());
        final ActivitySchedule schedule = activity.schedule();
        entity.setPlannedStartDate(schedule.plannedStart());
        entity.setPlannedEndDate(schedule.plannedEnd());
        entity.setActualStartDate(schedule.actualStart());
        entity.setActualEndDate(schedule.actualEnd());
        entity.setMeasurementMethod(activity.progress().method().name());
    }
}
