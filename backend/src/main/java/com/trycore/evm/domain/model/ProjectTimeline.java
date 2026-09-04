package com.trycore.evm.domain.model;

import java.util.List;

/**
 * Evolución de un proyecto a lo largo de sus fechas de corte, ordenada de la más antigua a la más
 * reciente. Contiene todo lo necesario para dibujar la curva de valores acumulados y la tendencia
 * de los índices sin que el cliente tenga que calcular nada.
 *
 * @param project proyecto analizado
 * @param points  un punto por medición registrada, en orden cronológico
 */
public record ProjectTimeline(Project project, List<MeasurementPoint> points) {

    public ProjectTimeline {
        points = List.copyOf(points);
    }
}
