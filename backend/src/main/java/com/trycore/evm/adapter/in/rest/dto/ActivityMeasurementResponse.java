package com.trycore.evm.adapter.in.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Cifras de una actividad dentro de un corte. Conserva el nombre que la actividad tenía en esa
 * fecha, de modo que el histórico se sigue leyendo aunque después se renombre o se elimine.
 */
public record ActivityMeasurementResponse(

        @Schema(
                description = "Identificador que tenía la actividad medida; puede apuntar a una "
                        + "actividad ya eliminada",
                example = "10")
        Long activityId,

        @Schema(description = "Nombre que tenía la actividad en el momento del corte",
                example = "Diseño de arquitectura")
        String activityName,

        @Schema(description = "Cifras de la actividad congeladas en la fecha de corte")
        EvmTotalsResponse totals) {
}
