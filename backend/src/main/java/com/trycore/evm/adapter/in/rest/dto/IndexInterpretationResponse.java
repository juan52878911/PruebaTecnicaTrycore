package com.trycore.evm.adapter.in.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Interpretación de un índice de desempeño (CPI o SPI) en las respuestas del API.
 *
 * <p>El estado dice qué ocurre y la severidad cuánto importa. Un índice puede estar sobre
 * presupuesto y aun así tener una desviación dentro de la tolerancia admitida, de modo que quien
 * pinte un color debe usar {@code severity} y quien muestre un texto, {@code status}.
 */
public record IndexInterpretationResponse(

        @Schema(description = "Estado del índice", example = "OVER_BUDGET")
        String status,

        @Schema(
                description = "Severidad de la desviación medida contra los umbrales de tolerancia",
                example = "WARNING",
                allowableValues = {"NONE", "WARNING", "CRITICAL", "NOT_APPLICABLE"})
        String severity,

        @Schema(
                description = "Mensaje explicativo del estado",
                example = "Sobre presupuesto: se gasta más de lo que se avanza")
        String message) {
}
