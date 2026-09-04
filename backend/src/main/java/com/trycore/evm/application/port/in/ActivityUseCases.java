package com.trycore.evm.application.port.in;

import java.util.List;

import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;

/**
 * Casos de uso disponibles sobre actividades de un proyecto. Puerto de entrada de la aplicación:
 * no depende de ningún framework, solo del modelo de dominio. Toda operación que devuelve una
 * actividad la entrega junto con sus indicadores de Valor Ganado ya calculados, para que ningún
 * adaptador tenga que invocar el cálculo por su cuenta.
 */
public interface ActivityUseCases {

    /** Crea una actividad nueva dentro de un proyecto existente. */
    ActivityEvm create(Long projectId, String name, ActivityFigures figures, ActivitySchedule schedule);

    /** Actualiza el nombre y las cifras de una actividad existente del proyecto. */
    ActivityEvm update(
            Long projectId, Long activityId, String name, ActivityFigures figures, ActivitySchedule schedule);

    /** Elimina una actividad del proyecto. */
    void delete(Long projectId, Long activityId);

    /** Lista las actividades de un proyecto, cada una con sus indicadores. */
    List<ActivityEvm> listByProject(Long projectId);
}
