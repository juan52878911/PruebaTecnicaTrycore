package com.trycore.evm.application.port.in;

import java.util.List;

import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;

/**
 * Casos de uso disponibles sobre actividades de un proyecto. Puerto de entrada de la aplicación:
 * no depende de ningún framework, solo del modelo de dominio.
 */
public interface ActivityUseCases {

    /** Crea una actividad nueva dentro de un proyecto existente. */
    Activity create(Long projectId, String name, ActivityFigures figures);

    /** Actualiza el nombre y las cifras de una actividad existente del proyecto. */
    Activity update(Long projectId, Long activityId, String name, ActivityFigures figures);

    /** Elimina una actividad del proyecto. */
    void delete(Long projectId, Long activityId);

    /** Lista las actividades de un proyecto. */
    List<Activity> listByProject(Long projectId);
}
