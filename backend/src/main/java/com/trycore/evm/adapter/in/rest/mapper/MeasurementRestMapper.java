package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.ActivityMeasurementResponse;
import com.trycore.evm.adapter.in.rest.dto.EvmTotalsResponse;
import com.trycore.evm.adapter.in.rest.dto.MeasurementResponse;
import com.trycore.evm.domain.model.ActivityMeasurement;
import com.trycore.evm.domain.model.EvmTotals;
import com.trycore.evm.domain.model.ProjectMeasurement;

/** Traducción explícita de un corte del histórico a su representación REST, sin librerías de mapeo. */
public final class MeasurementRestMapper {

    private MeasurementRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static MeasurementResponse toResponse(final ProjectMeasurement measurement) {
        return new MeasurementResponse(
                measurement.id(),
                measurement.projectId(),
                measurement.cutoffDate(),
                measurement.notes(),
                toResponse(measurement.totals()),
                measurement.activities().stream().map(MeasurementRestMapper::toResponse).toList(),
                measurement.createdAt());
    }

    /** Las cifras base se comparten con la serie temporal, que las expone en cada punto. */
    public static EvmTotalsResponse toResponse(final EvmTotals totals) {
        return new EvmTotalsResponse(
                totals.budgetAtCompletion(), totals.plannedValue(), totals.earnedValue(), totals.actualCost());
    }

    private static ActivityMeasurementResponse toResponse(final ActivityMeasurement activityMeasurement) {
        return new ActivityMeasurementResponse(
                activityMeasurement.activityId(),
                activityMeasurement.activityName(),
                toResponse(activityMeasurement.totals()));
    }
}
