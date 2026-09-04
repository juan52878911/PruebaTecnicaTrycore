package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.trycore.evm.domain.model.Activity;

import io.swagger.v3.oas.annotations.media.Schema;

/** Datos de entrada para crear o actualizar una actividad. */
public record ActivityRequest(

        @Schema(description = "Nombre de la actividad", example = "Diseño de arquitectura")
        @NotBlank(message = "El nombre de la actividad es obligatorio")
        @Size(
                max = Activity.NAME_MAX_LENGTH,
                message = "El nombre de la actividad no puede superar " + Activity.NAME_MAX_LENGTH + " caracteres")
        String name,

        @Schema(description = "Presupuesto total planificado (BAC)", example = "100000.00")
        @NotNull(message = "El presupuesto total planificado es obligatorio")
        @DecimalMin(value = "0", message = "El presupuesto total planificado no puede ser negativo")
        BigDecimal budgetAtCompletion,

        @Schema(description = "Porcentaje de avance planificado a la fecha de corte", example = "50.00")
        @NotNull(message = "El porcentaje de avance planificado es obligatorio")
        @DecimalMin(value = "0", message = "El porcentaje de avance planificado debe estar entre 0 y 100")
        @DecimalMax(value = "100", message = "El porcentaje de avance planificado debe estar entre 0 y 100")
        BigDecimal plannedProgressPercent,

        @Schema(description = "Porcentaje de avance real completado", example = "40.00")
        @NotNull(message = "El porcentaje de avance real es obligatorio")
        @DecimalMin(value = "0", message = "El porcentaje de avance real debe estar entre 0 y 100")
        @DecimalMax(value = "100", message = "El porcentaje de avance real debe estar entre 0 y 100")
        BigDecimal actualProgressPercent,

        @Schema(description = "Costo real incurrido (AC)", example = "60000.00")
        @NotNull(message = "El costo real es obligatorio")
        @DecimalMin(value = "0", message = "El costo real no puede ser negativo")
        BigDecimal actualCost) {
}
