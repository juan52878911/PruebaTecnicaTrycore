package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Umbrales con los que el servidor clasificó la severidad de las desviaciones.
 *
 * <p>Viajan en la respuesta para que ningún cliente tenga que repetirlos por su cuenta: si el
 * criterio de color viviera además en el navegador, las dos copias acabarían discrepando y la misma
 * cifra se pintaría de dos maneras según la pantalla.
 *
 * @param warning  índice a partir del cual no hay desviación relevante
 * @param critical índice por debajo del cual la desviación es crítica
 */
public record PerformanceThresholdsResponse(

        @Schema(description = "Índice a partir del cual no hay desviación relevante", example = "1.00")
        BigDecimal warning,

        @Schema(description = "Índice por debajo del cual la desviación es crítica", example = "0.95")
        BigDecimal critical) {
}
