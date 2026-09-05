package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Un hito de una actividad en las respuestas del API.
 *
 * <p>Se devuelven siempre, mande o no la regla de hitos el avance de la actividad. El cliente sabe
 * por {@code measurementMethod} si gobiernan, y con eso puede atenuarlos en la interfaz en vez de
 * ocultarlos, que es lo que evita que un cambio de regla parezca una pérdida de datos.
 */
public record MilestoneResponse(

        @Schema(description = "Nombre del hito", example = "Diseño")
        String name,

        @Schema(description = "Peso del hito sobre el total de la actividad", example = "20.00")
        BigDecimal weightPercent,

        @Schema(description = "Si el hito ya se cumplió", example = "true")
        boolean achieved,

        @Schema(description = "Fecha de cumplimiento; nula si el hito no se ha cumplido", example = "2026-09-15")
        LocalDate achievedOn) {
}
