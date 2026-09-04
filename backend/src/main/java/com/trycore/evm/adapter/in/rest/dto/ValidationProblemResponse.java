package com.trycore.evm.adapter.in.rest.dto;

import java.net.URI;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Forma real del cuerpo de un error de validación: un {@code ProblemDetail} de RFC 7807 al que el
 * manejador global añade la lista {@code errors} con el campo y el motivo de cada fallo.
 *
 * <p>Este record existe únicamente para que la especificación OpenAPI declare esa lista. El
 * manejador construye la respuesta con {@code ProblemDetail}, cuyo esquema generado no puede
 * describir las propiedades añadidas dinámicamente, de modo que documentarlo con el tipo base
 * dejaría fuera del contrato justo la parte que el cliente necesita para señalar el campo.
 */
@Schema(name = "ValidationProblem", description = "Error de validación en formato RFC 7807 con el detalle por campo")
public record ValidationProblemResponse(

        @Schema(description = "Identificador del tipo de problema", example = "about:blank")
        URI type,

        @Schema(description = "Resumen del tipo de problema", example = "Bad Request")
        String title,

        @Schema(description = "Código HTTP de la respuesta", example = "400")
        int status,

        @Schema(description = "Explicación del problema", example = "La petición contiene campos inválidos")
        String detail,

        @Schema(description = "Ruta que produjo el error", example = "/api/v1/projects/1/activities")
        URI instance,

        @Schema(description = "Campos que no superaron la validación, con su motivo")
        List<ValidationErrorResponse> errors) {
}
