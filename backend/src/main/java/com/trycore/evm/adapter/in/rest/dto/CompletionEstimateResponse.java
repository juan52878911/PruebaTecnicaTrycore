package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Una de las estimaciones estándar del costo final, con el supuesto de negocio que la hace válida.
 *
 * <p>Se devuelven las tres a la vez porque lo informativo es el rango que dibujan entre ellas: una
 * sola cifra esconde de qué supuesto depende.
 */
public record CompletionEstimateResponse(

        @Schema(
                description = "Fórmula empleada",
                example = "BAC_OVER_CPI",
                allowableValues = {"BAC_OVER_CPI", "AC_PLUS_REMAINING", "AC_PLUS_REMAINING_OVER_CPI_SPI"})
        String formula,

        @Schema(description = "Estimación a la conclusión; nula si la fórmula no es aplicable", example = "150000.00")
        BigDecimal estimateAtCompletion,

        @Schema(description = "Variación a la conclusión; nula si la estimación lo es", example = "-50000.00")
        BigDecimal varianceAtCompletion,

        @Schema(description = "Indica si esta fórmula pudo calcularse con las cifras dadas", example = "true")
        boolean applicable,

        @Schema(
                description = "Supuesto sobre el futuro que hace válida esta estimación",
                example = "El desempeño de costo observado se mantiene hasta el final")
        String assumption) {
}
