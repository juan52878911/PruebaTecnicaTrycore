package com.trycore.evm.adapter.in.rest.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Representación de un proyecto en las respuestas del API.
 *
 * <p>Las tres últimas propiedades son el bloque de cifras derivadas y solo viajan cuando se pide
 * el listado con {@code includeIndicators=true}. Están marcadas para omitirse cuando son nulas,
 * de modo que la respuesta de quien no las pide es exactamente la de antes de que existieran:
 * ni un campo nuevo, ni un nulo que interpretar.
 */
public record ProjectResponse(

        @Schema(description = "Identificador del proyecto", example = "1")
        Long id,

        @Schema(description = "Nombre del proyecto", example = "Plataforma de pagos")
        String name,

        @Schema(description = "Descripción del proyecto", example = "Proyecto de demostración para el análisis "
                + "de Valor Ganado")
        String description,

        @Schema(description = "Responsable del proyecto; nulo si todavía no hay ninguno asignado",
                example = "Alicia Ramos")
        String manager,

        @Schema(description = "Fecha de creación", example = "2026-09-03T21:00:00Z")
        Instant createdAt,

        @Schema(description = "Fecha de última modificación", example = "2026-09-03T21:00:00Z")
        Instant updatedAt,

        @JsonInclude(JsonInclude.Include.NON_NULL)
        @Schema(description = "Número de actividades del proyecto; solo con includeIndicators=true", example = "24")
        Integer activityCount,

        @JsonInclude(JsonInclude.Include.NON_NULL)
        @Schema(description = "Sumas de BAC, PV, EV y AC del proyecto; solo con includeIndicators=true")
        EvmTotalsResponse totals,

        @JsonInclude(JsonInclude.Include.NON_NULL)
        @Schema(description = "Indicadores consolidados del proyecto; solo con includeIndicators=true")
        EvmIndicatorsResponse indicators) {
}
