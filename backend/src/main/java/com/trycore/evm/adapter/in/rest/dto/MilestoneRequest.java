package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.Milestone;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Un hito dentro de la petición de una actividad.
 *
 * <p>No existe un recurso propio para los hitos: viajan siempre dentro de la actividad y se
 * escriben en bloque. Una invariante sobre el conjunto (que los pesos sumen 100) solo es exigible
 * si el conjunto se escribe de una vez, y una actividad medida por hitos debe tener hitos válidos
 * desde el primer instante, así que un alta de hito por separado no tendría ningún estado inicial
 * legal en el que apoyarse.
 *
 * <p>La posición del hito es su orden en la lista, no un campo: por eso no se envía.
 */
public record MilestoneRequest(

        @Schema(description = "Nombre del hito", example = "Diseño")
        @NotBlank(message = "El nombre del hito es obligatorio")
        @Size(
                max = Milestone.NAME_MAX_LENGTH,
                message = "El nombre del hito no puede superar " + Milestone.NAME_MAX_LENGTH + " caracteres")
        String name,

        @Schema(description = "Peso del hito sobre el total de la actividad", example = "20.00")
        @NotNull(message = "El peso del hito es obligatorio")
        @DecimalMin(
                value = Milestone.MIN_WEIGHT_VALUE,
                inclusive = false,
                message = "El peso del hito debe ser mayor que cero")
        @DecimalMax(value = ActivityFigures.MAX_PERCENT_VALUE, message = "El peso del hito no puede superar 100")
        @Digits(
                integer = ActivityFigures.PERCENT_MAX_INTEGER_DIGITS,
                fraction = ActivityFigures.PERCENT_SCALE,
                message = "El peso del hito admite hasta 2 decimales")
        BigDecimal weightPercent,

        @Schema(description = "Si el hito ya se cumplió", example = "true")
        boolean achieved,

        @Schema(description = "Fecha de cumplimiento; solo admisible en un hito cumplido", example = "2026-09-15")
        LocalDate achievedOn) {
}
