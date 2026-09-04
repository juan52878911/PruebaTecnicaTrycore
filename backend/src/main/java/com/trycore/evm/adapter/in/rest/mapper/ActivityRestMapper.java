package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.EvmIndicators;

/** Traducción explícita de la actividad de dominio a su representación REST, sin librerías de mapeo. */
public final class ActivityRestMapper {

    private ActivityRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ActivityResponse toResponse(final Activity activity, final EvmIndicators indicators) {
        return new ActivityResponse(
                activity.id(),
                activity.projectId(),
                activity.name(),
                activity.figures().budgetAtCompletion(),
                activity.figures().plannedProgressPercent(),
                activity.figures().actualProgressPercent(),
                activity.figures().actualCost(),
                EvmIndicatorsRestMapper.toResponse(indicators));
    }

    public static ActivityResponse toResponse(final ActivityEvm activityEvm) {
        return toResponse(activityEvm.activity(), activityEvm.indicators());
    }
}
