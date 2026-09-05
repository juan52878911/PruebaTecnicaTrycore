package com.trycore.evm.application.port.in;

import java.util.List;

import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectEvmSummary;

/**
 * Casos de uso disponibles sobre proyectos. Puerto de entrada de la aplicación: no depende de
 * ningún framework, solo del modelo de dominio.
 */
public interface ProjectUseCases {

    /** Crea un proyecto nuevo con el nombre, la descripción y el responsable indicados. */
    Project create(String name, String description, String manager);

    /** Actualiza el nombre, la descripción y el responsable de un proyecto existente. */
    Project update(Long id, String name, String description, String manager);

    /** Elimina un proyecto y, en cascada, sus actividades. */
    void delete(Long id);

    /** Obtiene un proyecto por su identificador. */
    Project get(Long id);

    /** Lista todos los proyectos, sin cifras derivadas. */
    List<Project> list();

    /**
     * Lista todos los proyectos con su consolidado de Valor Ganado.
     *
     * <p>Existe para que una pantalla de listado con cifras no tenga que pedir el análisis
     * proyecto por proyecto: la implementación carga las actividades de todos ellos de una vez y
     * consolida en memoria, de modo que el número de consultas no crece con el de proyectos.
     */
    List<ProjectEvmSummary> listWithIndicators();
}
