package com.trycore.evm.adapter.out.persistence;

import java.util.List;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.MeasurementMethod;
import com.trycore.evm.domain.model.Milestone;
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
                MeasurementMethod.valueOf(entity.getMeasurementMethod()), toDomainMilestones(entity));
        return new Activity(
                entity.getId(), entity.getProjectId(), entity.getName(), figures, schedule, progress,
                entity.getCreatedAt(), entity.getUpdatedAt());
    }

    /** Copia proyecto, nombre, cifras, fechas e hitos de la actividad de dominio a la entidad. */
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
        replaceMilestones(activity.progress().milestones(), entity);
    }

    private static List<Milestone> toDomainMilestones(final ActivityJpaEntity entity) {
        return entity.getMilestones().stream()
                .map(row -> new Milestone(
                        row.getName(), row.getWeightPercent(), row.isAchieved(), row.getAchievedOn()))
                .toList();
    }

    /**
     * Reemplaza por completo la tabla de hitos de la actividad.
     *
     * <p>Las filas se reutilizan por posición en vez de borrarlas todas y volver a insertarlas. No
     * es una optimización: la unicidad de (activity_id, position) se comprobaría fila a fila, y
     * dentro de un mismo vaciado JPA los INSERT se emiten antes que los DELETE, así que un borrado
     * y alta completos chocarían contra la restricción con posiciones que aún no se han liberado.
     * Actualizando en el sitio y recortando por la cola, la posición de cada fila superviviente no
     * cambia y no hay colisión posible.
     */
    private static void replaceMilestones(final List<Milestone> milestones, final ActivityJpaEntity entity) {
        final List<ActivityMilestoneJpaEntity> rows = entity.getMilestones();
        while (rows.size() > milestones.size()) {
            rows.remove(rows.size() - 1);
        }
        for (int position = 0; position < milestones.size(); position++) {
            copyMilestone(milestones.get(position), position, rowAt(entity, position));
        }
    }

    private static ActivityMilestoneJpaEntity rowAt(final ActivityJpaEntity entity, final int position) {
        final List<ActivityMilestoneJpaEntity> rows = entity.getMilestones();
        if (position < rows.size()) {
            return rows.get(position);
        }
        final ActivityMilestoneJpaEntity row = new ActivityMilestoneJpaEntity(entity);
        rows.add(row);
        return row;
    }

    private static void copyMilestone(
            final Milestone milestone, final int position, final ActivityMilestoneJpaEntity row) {
        row.setName(milestone.name());
        row.setWeightPercent(milestone.weightPercent());
        row.setAchieved(milestone.achieved());
        row.setAchievedOn(milestone.achievedOn());
        row.setPosition(position);
    }
}
