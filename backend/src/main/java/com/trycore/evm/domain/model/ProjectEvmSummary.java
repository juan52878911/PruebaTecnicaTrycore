package com.trycore.evm.domain.model;

import java.math.BigDecimal;
import java.util.List;

/**
 * Análisis de Valor Ganado consolidado de un proyecto.
 *
 * <p>Los indicadores consolidados se calculan sobre las sumas de BAC, PV, EV y AC de todas las
 * actividades, nunca promediando los índices de cada actividad.
 *
 * @param project            proyecto analizado
 * @param budgetAtCompletion suma de los BAC de las actividades
 * @param indicators         indicadores calculados sobre las sumas
 * @param activities         cada actividad con sus propios indicadores
 */
public record ProjectEvmSummary(
        Project project,
        BigDecimal budgetAtCompletion,
        EvmIndicators indicators,
        List<ActivityEvm> activities) {

    public ProjectEvmSummary {
        activities = List.copyOf(activities);
    }
}
