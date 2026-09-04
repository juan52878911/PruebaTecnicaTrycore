package com.trycore.evm.application.port.out;

import java.util.List;
import java.util.Optional;

import com.trycore.evm.domain.model.Project;

/**
 * Puerto de salida para la persistencia de proyectos. Lo implementa el adaptador de
 * infraestructura correspondiente; la aplicación solo conoce esta interfaz.
 */
public interface ProjectRepositoryPort {

    /** Guarda un proyecto nuevo o existente y devuelve la versión persistida. */
    Project save(Project project);

    /** Busca un proyecto por su identificador. */
    Optional<Project> findById(Long id);

    /** Lista todos los proyectos. */
    List<Project> findAll();

    /** Elimina un proyecto por su identificador. */
    void deleteById(Long id);

    /** Indica si existe un proyecto con el identificador dado. */
    boolean existsById(Long id);
}
