package com.trycore.evm.application.port.out;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import com.trycore.evm.domain.model.ProjectMeasurement;

/**
 * Puerto de salida para la persistencia del histórico de mediciones. Lo implementa el adaptador de
 * infraestructura correspondiente; la aplicación solo conoce esta interfaz.
 *
 * <p>No hay operación de actualización: una medición es un registro histórico inmutable. Para
 * rectificarla se borra y se vuelve a tomar.
 */
public interface ProjectMeasurementRepositoryPort {

    /** Guarda una medición nueva con sus líneas por actividad y devuelve la versión persistida. */
    ProjectMeasurement save(ProjectMeasurement measurement);

    /** Busca una medición por su identificador dentro de un proyecto concreto. */
    Optional<ProjectMeasurement> findByIdAndProjectId(Long id, Long projectId);

    /** Lista las mediciones de un proyecto ordenadas por fecha de corte ascendente. */
    List<ProjectMeasurement> findAllByProjectId(Long projectId);

    /** Indica si el proyecto ya tiene un corte en esa fecha. */
    boolean existsByProjectIdAndCutoffDate(Long projectId, LocalDate cutoffDate);

    /** Elimina una medición por su identificador, junto con sus líneas por actividad. */
    void deleteById(Long id);
}
