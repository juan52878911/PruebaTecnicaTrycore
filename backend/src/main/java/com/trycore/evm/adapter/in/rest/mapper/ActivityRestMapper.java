package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;

/** Traducción explícita de la actividad de dominio a su representación REST, sin librerías de mapeo. */
public final class ActivityRestMapper {

    private ActivityRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ActivityResponse toResponse(final ActivityEvm activityEvm) {
        final Activity activity = activityEvm.activity();
        return new ActivityResponse(
                activity.id(),
                activity.projectId(),
                activity.name(),
                activity.figures().budgetAtCompletion(),
                activity.figures().plannedProgressPercent(),
                activity.figures().actualProgressPercent(),
                activity.figures().actualCost(),
                EvmIndicatorsRestMapper.toResponse(activityEvm.indicators()));
    }
}
