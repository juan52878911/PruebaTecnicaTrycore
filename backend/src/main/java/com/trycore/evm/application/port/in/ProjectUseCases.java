package com.trycore.evm.application.port.in;

import java.util.List;

import com.trycore.evm.domain.model.Project;

/**
 * Casos de uso disponibles sobre proyectos. Puerto de entrada de la aplicación: no depende de
 * ningún framework, solo del modelo de dominio.
 */
public interface ProjectUseCases {

    /** Crea un proyecto nuevo con el nombre y la descripción indicados. */
    Project create(String name, String description);

    /** Actualiza el nombre y la descripción de un proyecto existente. */
    Project update(Long id, String name, String description);

    /** Elimina un proyecto y, en cascada, sus actividades. */
    void delete(Long id);

    /** Obtiene un proyecto por su identificador. */
    Project get(Long id);

    /** Lista todos los proyectos. */
    List<Project> list();
}
