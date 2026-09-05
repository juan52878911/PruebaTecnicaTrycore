package com.trycore.evm.application.port.in;

import com.trycore.evm.domain.model.EstimateFormula;
import com.trycore.evm.domain.model.ProjectEvmSummary;

/**
 * Caso de uso de análisis de Valor Ganado de un proyecto. Puerto de entrada de la aplicación: no
 * depende de ningún framework, solo del modelo de dominio.
 */
public interface ProjectEvmUseCase {

    /** Analiza el Valor Ganado de un proyecto: sus indicadores consolidados y los de cada actividad. */
    ProjectEvmSummary analyze(Long projectId);

    /**
     * Igual que {@link #analyze(Long)} pero eligiendo con qué fórmula se calcula el EAC titular.
     * Las tres estimaciones estándar viajan siempre en el resultado, sea cual sea la elegida.
     */
    ProjectEvmSummary analyze(Long projectId, EstimateFormula formula);
}
