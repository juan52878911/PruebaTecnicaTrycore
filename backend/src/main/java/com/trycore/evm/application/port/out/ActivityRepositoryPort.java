package com.trycore.evm.application.port.out;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.trycore.evm.domain.model.Activity;

/**
 * Puerto de salida para la persistencia de actividades. Lo implementa el adaptador de
 * infraestructura correspondiente; la aplicación solo conoce esta interfaz.
 */
public interface ActivityRepositoryPort {

    /** Guarda una actividad nueva o existente y devuelve la versión persistida. */
    Activity save(Activity activity);

    /** Busca una actividad por su identificador dentro de un proyecto concreto. */
    Optional<Activity> findByIdAndProjectId(Long id, Long projectId);

    /** Lista las actividades de un proyecto. */
    List<Activity> findAllByProjectId(Long projectId);

    /**
     * Lista de una sola vez las actividades de varios proyectos.
     *
     * <p>Es la carga por lote que evita el problema N+1 en el listado con indicadores: quien la
     * usa agrupa el resultado por proyecto en memoria en lugar de consultar uno por uno. Con una
     * colección vacía devuelve la lista vacía sin ir a la base de datos.
     */
    List<Activity> findAllByProjectIdIn(Collection<Long> projectIds);

    /** Elimina una actividad por su identificador. */
    void deleteById(Long id);
}
