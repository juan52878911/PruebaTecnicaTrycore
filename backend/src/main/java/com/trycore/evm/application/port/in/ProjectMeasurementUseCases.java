package com.trycore.evm.application.port.in;

import java.time.LocalDate;
import java.util.List;

import com.trycore.evm.domain.model.ProjectMeasurement;
import com.trycore.evm.domain.model.ProjectTimeline;

/**
 * Casos de uso del histórico de mediciones de un proyecto. Puerto de entrada de la aplicación: no
 * depende de ningún framework, solo del modelo de dominio.
 *
 * <p>Una medición devuelve solo las cifras que quedaron congeladas. Los indicadores aparecen en la
 * serie temporal, que es donde se necesitan para graficar, y se calculan al leer con el servicio de
 * dominio en vez de almacenarse.
 */
public interface ProjectMeasurementUseCases {

    /** Captura el estado actual del proyecto en una fecha de corte y lo registra. */
    ProjectMeasurement record(Long projectId, LocalDate cutoffDate, String notes);

    /** Lista las mediciones del proyecto, de la más antigua a la más reciente. */
    List<ProjectMeasurement> list(Long projectId);

    /** Devuelve una medición concreta del proyecto. */
    ProjectMeasurement get(Long projectId, Long measurementId);

    /** Elimina una medición del proyecto. */
    void delete(Long projectId, Long measurementId);

    /** Serie temporal del proyecto: un punto por corte, con sus indicadores ya calculados. */
    ProjectTimeline timeline(Long projectId);
}
