package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.MeasurementPointResponse;
import com.trycore.evm.adapter.in.rest.dto.ProjectTimelineResponse;
import com.trycore.evm.domain.model.MeasurementPoint;
import com.trycore.evm.domain.model.ProjectTimeline;

/**
 * Traducción explícita de la serie temporal del proyecto a su representación REST, sin librerías
 * de mapeo. El orden de los puntos es el que fija el dominio; aquí no se reordena nada.
 */
public final class ProjectTimelineRestMapper {

    private ProjectTimelineRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static ProjectTimelineResponse toResponse(final ProjectTimeline timeline) {
        return new ProjectTimelineResponse(
                ProjectRestMapper.toResponse(timeline.project()),
                timeline.points().stream().map(ProjectTimelineRestMapper::toResponse).toList());
    }

    private static MeasurementPointResponse toResponse(final MeasurementPoint point) {
        return new MeasurementPointResponse(
                point.cutoffDate(),
                point.notes(),
                MeasurementRestMapper.toResponse(point.totals()),
                EvmIndicatorsRestMapper.toResponse(point.indicators()));
    }
}
