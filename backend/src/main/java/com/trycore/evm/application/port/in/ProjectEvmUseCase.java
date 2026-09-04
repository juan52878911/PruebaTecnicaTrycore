package com.trycore.evm.application.port.in;

import com.trycore.evm.domain.model.ProjectEvmSummary;

/**
 * Caso de uso de análisis de Valor Ganado de un proyecto. Puerto de entrada de la aplicación: no
 * depende de ningún framework, solo del modelo de dominio.
 */
public interface ProjectEvmUseCase {

    /** Analiza el Valor Ganado de un proyecto: sus indicadores consolidados y los de cada actividad. */
    ProjectEvmSummary analyze(Long projectId);
}
