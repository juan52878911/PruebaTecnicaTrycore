package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Datos de entrada para crear o actualizar una actividad.
 *
 * <p>Los límites se toman de las constantes del dominio en vez de repetirse como literales, para
 * que la validación HTTP y la del modelo no puedan divergir. Las restricciones de dígitos existen
 * para que un valor demasiado preciso o demasiado grande se rechace con un 400 que nombra el campo,
 * en lugar de llegar a la base de datos y redondearse o desbordar.
 */
public record ActivityRequest(

        @Schema(description = "Nombre de la actividad", example = "Diseño de arquitectura")
        @NotBlank(message = "El nombre de la actividad es obligatorio")
        @Size(
                max = Activity.NAME_MAX_LENGTH,
                message = "El nombre de la actividad no puede superar " + Activity.NAME_MAX_LENGTH + " caracteres")
        String name,

        @Schema(description = "Presupuesto total planificado (BAC)", example = "100000.00")
        @NotNull(message = "El presupuesto total planificado es obligatorio")
        @DecimalMin(
                value = ActivityFigures.MIN_MONEY_VALUE,
                message = "El presupuesto total planificado no puede ser negativo")
        @Digits(
                integer = ActivityFigures.MONEY_MAX_INTEGER_DIGITS,
                fraction = ActivityFigures.MONEY_SCALE,
                message = "El presupuesto total planificado admite hasta 17 dígitos enteros y 2 decimales")
        BigDecimal budgetAtCompletion,

        @Schema(description = "Porcentaje de avance planificado a la fecha de corte", example = "50.00")
        @NotNull(message = "El porcentaje de avance planificado es obligatorio")
        @DecimalMin(
                value = ActivityFigures.MIN_PERCENT_VALUE,
                message = "El porcentaje de avance planificado debe estar entre 0 y 100")
        @DecimalMax(
                value = ActivityFigures.MAX_PERCENT_VALUE,
                message = "El porcentaje de avance planificado debe estar entre 0 y 100")
        @Digits(
                integer = ActivityFigures.PERCENT_MAX_INTEGER_DIGITS,
                fraction = ActivityFigures.PERCENT_SCALE,
                message = "El porcentaje de avance planificado admite hasta 2 decimales")
        BigDecimal plannedProgressPercent,

        @Schema(description = "Porcentaje de avance real completado", example = "40.00")
        @NotNull(message = "El porcentaje de avance real es obligatorio")
        @DecimalMin(
                value = ActivityFigures.MIN_PERCENT_VALUE,
                message = "El porcentaje de avance real debe estar entre 0 y 100")
        @DecimalMax(
                value = ActivityFigures.MAX_PERCENT_VALUE,
                message = "El porcentaje de avance real debe estar entre 0 y 100")
        @Digits(
                integer = ActivityFigures.PERCENT_MAX_INTEGER_DIGITS,
                fraction = ActivityFigures.PERCENT_SCALE,
                message = "El porcentaje de avance real admite hasta 2 decimales")
        BigDecimal actualProgressPercent,

        @Schema(description = "Costo real incurrido (AC)", example = "60000.00")
        @NotNull(message = "El costo real es obligatorio")
        @DecimalMin(value = ActivityFigures.MIN_MONEY_VALUE, message = "El costo real no puede ser negativo")
        @Digits(
                integer = ActivityFigures.MONEY_MAX_INTEGER_DIGITS,
                fraction = ActivityFigures.MONEY_SCALE,
                message = "El costo real admite hasta 17 dígitos enteros y 2 decimales")
        BigDecimal actualCost) {
}
