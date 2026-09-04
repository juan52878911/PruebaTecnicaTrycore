package com.trycore.evm.application.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import com.trycore.evm.application.port.in.ProjectMeasurementUseCases;
import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectMeasurementRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.domain.exception.InvalidMeasurementException;
import com.trycore.evm.domain.exception.MeasurementAlreadyExistsException;
import com.trycore.evm.domain.exception.MeasurementNotFoundException;
import com.trycore.evm.domain.exception.ProjectNotFoundException;
import com.trycore.evm.domain.model.Project;
import com.trycore.evm.domain.model.ProjectMeasurement;
import com.trycore.evm.domain.model.ProjectTimeline;
import com.trycore.evm.domain.service.EvmCalculator;

/**
 * Implementación de los casos de uso del histórico de mediciones. Clase plana sin anotaciones de
 * framework: el cableado con Spring vive en {@code com.trycore.evm.config.BeanConfiguration}.
 *
 * <p>El servicio decide cuándo se puede tomar un corte; congelarlo es responsabilidad del
 * {@link EvmCalculator}, y guardarlo, del puerto de salida.
 *
 * <p>El reloj se recibe por constructor en lugar de leerse del sistema. La regla de que un corte no
 * puede ser futuro depende de qué día es hoy, y con el reloj fijo esa regla se puede probar sin que
 * el resultado dependa de cuándo se ejecute la prueba. {@link Clock} es de la biblioteca estándar,
 * así que no introduce ninguna dependencia de infraestructura en esta capa.
 */
public final class ProjectMeasurementService implements ProjectMeasurementUseCases {

    private static final String FUTURE_CUTOFF_REASON =
            "La fecha de corte no puede ser futura: un corte documenta lo que ya ocurrió, no una previsión";

    private final ProjectRepositoryPort projectRepository;
    private final ActivityRepositoryPort activityRepository;
    private final ProjectMeasurementRepositoryPort measurementRepository;
    private final EvmCalculator evmCalculator;
    private final Clock clock;

    public ProjectMeasurementService(
            final ProjectRepositoryPort projectRepository,
            final ActivityRepositoryPort activityRepository,
            final ProjectMeasurementRepositoryPort measurementRepository,
            final EvmCalculator evmCalculator,
            final Clock clock) {
        this.projectRepository = projectRepository;
        this.activityRepository = activityRepository;
        this.measurementRepository = measurementRepository;
        this.evmCalculator = evmCalculator;
        this.clock = clock;
    }

    @Override
    public ProjectMeasurement record(final Long projectId, final LocalDate cutoffDate, final String notes) {
        final Project project = findProject(projectId);
        requireCutoffIsFree(projectId, cutoffDate);
        requireCutoffIsNotInTheFuture(cutoffDate);
        final ProjectMeasurement captured = evmCalculator.capture(
                project, activityRepository.findAllByProjectId(projectId), cutoffDate, notes);
        return measurementRepository.save(captured);
    }

    @Override
    public List<ProjectMeasurement> list(final Long projectId) {
        requireProjectExists(projectId);
        return measurementRepository.findAllByProjectId(projectId);
    }

    @Override
    public ProjectMeasurement get(final Long projectId, final Long measurementId) {
        return findMeasurement(projectId, measurementId);
    }

    @Override
    public void delete(final Long projectId, final Long measurementId) {
        findMeasurement(projectId, measurementId);
        measurementRepository.deleteById(measurementId);
    }

    @Override
    public ProjectTimeline timeline(final Long projectId) {
        final Project project = findProject(projectId);
        return evmCalculator.buildTimeline(project, measurementRepository.findAllByProjectId(projectId));
    }

    private Project findProject(final Long projectId) {
        return projectRepository.findById(projectId).orElseThrow(() -> new ProjectNotFoundException(projectId));
    }

    private void requireProjectExists(final Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ProjectNotFoundException(projectId);
        }
    }

    private ProjectMeasurement findMeasurement(final Long projectId, final Long measurementId) {
        return measurementRepository.findByIdAndProjectId(measurementId, projectId)
                .orElseThrow(() -> new MeasurementNotFoundException(projectId, measurementId));
    }

    private void requireCutoffIsFree(final Long projectId, final LocalDate cutoffDate) {
        if (measurementRepository.existsByProjectIdAndCutoffDate(projectId, cutoffDate)) {
            throw new MeasurementAlreadyExistsException(projectId, cutoffDate);
        }
    }

    /**
     * Un corte documenta lo ya ocurrido: con una fecha futura las cifras no corresponderían a ella.
     *
     * <p>La fecha ausente no se comprueba aquí porque ya es una invariante de
     * {@link ProjectMeasurement}: dejarla pasar hasta el modelo evita duplicar el mensaje de error.
     */
    private void requireCutoffIsNotInTheFuture(final LocalDate cutoffDate) {
        if (cutoffDate != null && cutoffDate.isAfter(LocalDate.now(clock))) {
            throw new InvalidMeasurementException(FUTURE_CUTOFF_REASON);
        }
    }
}
