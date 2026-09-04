package com.trycore.evm.adapter.in.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Interpretación de un índice de desempeño (CPI o SPI) en las respuestas del API. */
public record IndexInterpretationResponse(

        @Schema(description = "Estado del índice", example = "OVER_BUDGET")
        String status,

        @Schema(
                description = "Mensaje explicativo del estado",
                example = "Sobre presupuesto: se gasta más de lo que se avanza")
        String message) {
}
