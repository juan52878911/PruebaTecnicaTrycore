package com.trycore.evm.adapter.in.rest.mapper;

import com.trycore.evm.adapter.in.rest.dto.EvmIndicatorsResponse;
import com.trycore.evm.adapter.in.rest.dto.IndexInterpretationResponse;
import com.trycore.evm.domain.model.EvmIndicators;
import com.trycore.evm.domain.model.IndexInterpretation;

/** Traducción explícita de los indicadores de Valor Ganado a su representación REST, sin librerías de mapeo. */
public final class EvmIndicatorsRestMapper {

    private EvmIndicatorsRestMapper() {
        // Utilidad estática, no instanciable.
    }

    public static EvmIndicatorsResponse toResponse(final EvmIndicators indicators) {
        return new EvmIndicatorsResponse(
                indicators.plannedValue(),
                indicators.earnedValue(),
                indicators.actualCost(),
                indicators.costVariance(),
                indicators.scheduleVariance(),
                indicators.costPerformanceIndex(),
                indicators.schedulePerformanceIndex(),
                indicators.estimateAtCompletion(),
                indicators.varianceAtCompletion(),
                toResponse(indicators.costStatus()),
                toResponse(indicators.scheduleStatus()));
    }

    private static IndexInterpretationResponse toResponse(final IndexInterpretation interpretation) {
        return new IndexInterpretationResponse(interpretation.status().name(), interpretation.message());
    }
}
