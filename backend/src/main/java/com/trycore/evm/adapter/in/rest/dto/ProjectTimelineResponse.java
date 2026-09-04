package com.trycore.evm.adapter.in.rest.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Evolución de un proyecto a lo largo de sus cortes, lista para graficar: un punto por medición,
 * ordenados del más antiguo al más reciente y con los indicadores ya calculados.
 */
public record ProjectTimelineResponse(

        @Schema(description = "Proyecto analizado")
        ProjectResponse project,

        @Schema(description = "Puntos de la serie, en orden cronológico ascendente")
        List<MeasurementPointResponse> points) {
}
