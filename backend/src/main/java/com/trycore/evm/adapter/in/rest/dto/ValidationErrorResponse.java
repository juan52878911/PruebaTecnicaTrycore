package com.trycore.evm.adapter.in.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Un campo inválido y el motivo, dentro de la lista {@code errors} de un error de validación (RFC 7807). */
public record ValidationErrorResponse(

        @Schema(description = "Campo que no superó la validación", example = "plannedProgressPercent")
        String field,

        @Schema(description = "Motivo por el que el campo es inválido", example = "debe estar entre 0 y 100")
        String message) {
}
