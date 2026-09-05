package com.trycore.evm.adapter.in.rest.mapper;

import java.util.List;

import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.adapter.in.rest.dto.MilestoneResponse;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.ProgressMeasurement;

/** Traducción explícita de la actividad de dominio a su representación REST, sin librerías de mapeo. */
public final class ActivityRestMapper {

    private ActivityRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ActivityResponse toResponse(final ActivityEvm activityEvm) {
        final Activity activity = activityEvm.activity();
        final ActivitySchedule schedule = activity.schedule();
        final ProgressMeasurement progress = activity.progress();
        return new ActivityResponse(
                activity.id(),
                activity.projectId(),
                activity.name(),
                activity.figures().budgetAtCompletion(),
                activity.figures().plannedProgressPercent(),
                activity.figures().actualProgressPercent(),
                activity.figures().actualCost(),
                schedule.plannedStart(),
                schedule.plannedEnd(),
                schedule.actualStart(),
                schedule.actualEnd(),
                progress.method().name(),
                progress.method().description(),
                activityEvm.effectivePlannedPercent(),
                activityEvm.effectiveActualPercent(),
                progress.derivedProgressPercent().orElse(null),
                toMilestoneResponses(progress),
                EvmIndicatorsRestMapper.toResponse(activityEvm.indicators()));
    }

    private static List<MilestoneResponse> toMilestoneResponses(final ProgressMeasurement progress) {
        return progress.milestones().stream()
                .map(milestone -> new MilestoneResponse(
                        milestone.name(),
                        milestone.weightPercent(),
                        milestone.achieved(),
                        milestone.achievedOn()))
                .toList();
    }
}
