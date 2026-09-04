package com.trycore.evm.adapter.in.rest.dto;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/** Representación de un proyecto en las respuestas del API. */
public record ProjectResponse(

        @Schema(description = "Identificador del proyecto", example = "1")
        Long id,

        @Schema(description = "Nombre del proyecto", example = "Plataforma de pagos")
        String name,

        @Schema(description = "Descripción del proyecto", example = "Proyecto de demostración para el análisis "
                + "de Valor Ganado")
        String description,

        @Schema(description = "Fecha de creación", example = "2026-09-03T21:00:00Z")
        Instant createdAt,

        @Schema(description = "Fecha de última modificación", example = "2026-09-03T21:00:00Z")
        Instant updatedAt) {
}
