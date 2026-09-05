package com.trycore.evm.adapter.in.rest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.trycore.evm.domain.model.Project;

import io.swagger.v3.oas.annotations.media.Schema;

/** Datos de entrada para crear o actualizar un proyecto. */
public record ProjectRequest(

        @Schema(description = "Nombre del proyecto", example = "Plataforma de pagos")
        @NotBlank(message = "El nombre del proyecto es obligatorio")
        @Size(
                max = Project.NAME_MAX_LENGTH,
                message = "El nombre del proyecto no puede superar " + Project.NAME_MAX_LENGTH + " caracteres")
        String name,

        @Schema(description = "Descripción del proyecto", example = "Proyecto de demostración para el análisis "
                + "de Valor Ganado")
        @Size(
                max = Project.DESCRIPTION_MAX_LENGTH,
                message = "La descripción del proyecto no puede superar "
                        + Project.DESCRIPTION_MAX_LENGTH + " caracteres")
        String description,

        @Schema(description = "Responsable del proyecto; se omite si todavía no hay ninguno asignado",
                example = "Alicia Ramos")
        @Size(
                max = Project.MANAGER_MAX_LENGTH,
                message = "El responsable del proyecto no puede superar "
                        + Project.MANAGER_MAX_LENGTH + " caracteres")
        String manager) {
}
