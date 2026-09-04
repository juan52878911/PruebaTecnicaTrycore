package com.trycore.evm.adapter.in.rest.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.trycore.evm.domain.model.ProjectMeasurement;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Datos de entrada para registrar un corte del histórico.
 *
 * <p>No lleva cifras: el corte fotografía el estado que el proyecto tiene en ese momento, y
 * dejarlas escribir a mano permitiría guardar un histórico que no corresponde a ningún dato real.
 * El límite del comentario se toma de la constante del dominio para que la validación HTTP y la
 * del modelo no puedan divergir.
 */
public record MeasurementRequest(

        @Schema(description = "Fecha a la que se refieren las cifras del corte", example = "2026-08-31")
        @NotNull(message = "La fecha de corte es obligatoria")
        LocalDate cutoffDate,

        @Schema(description = "Comentario del líder sobre el corte", example = "Cierre de la semana 1")
        @Size(
                max = ProjectMeasurement.NOTES_MAX_LENGTH,
                message = "El comentario no puede superar "
                        + ProjectMeasurement.NOTES_MAX_LENGTH + " caracteres")
        String notes) {
}
