package com.trycore.evm.adapter.in.rest.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Las cuatro cifras base de Valor Ganado congeladas en un corte. Es lo único que guarda el
 * histórico: los índices se derivan de ellas al leer.
 */
public record EvmTotalsResponse(

        @Schema(description = "Presupuesto total planificado (BAC)", example = "430000.00")
        BigDecimal budgetAtCompletion,

        @Schema(description = "Valor planificado a la fecha de corte (PV)", example = "170000.00")
        BigDecimal plannedValue,

        @Schema(description = "Valor ganado a la fecha de corte (EV)", example = "152500.00")
        BigDecimal earnedValue,

        @Schema(description = "Costo real incurrido a la fecha de corte (AC)", example = "160000.00")
        BigDecimal actualCost) {
}
