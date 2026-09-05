package com.trycore.evm.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.trycore.evm.application.port.out.ActivityRepositoryPort;
import com.trycore.evm.application.port.out.ProjectMeasurementRepositoryPort;
import com.trycore.evm.application.port.out.ProjectRepositoryPort;
import com.trycore.evm.application.service.ActivityService;
import com.trycore.evm.application.service.ProjectEvmService;
import com.trycore.evm.application.service.ProjectMeasurementService;
import com.trycore.evm.application.service.ProjectService;
import com.trycore.evm.domain.service.EvmCalculator;

/**
 * Cableado de la aplicación: aquí, y solo aquí, se construyen los servicios de la capa
 * {@code application} recibiendo por parámetro los puertos de salida que implementan los
 * adaptadores de infraestructura.
 */
@Configuration
public class BeanConfiguration {

    /** Reloj del sistema. Se declara como bean para que una prueba pueda sustituirlo por uno fijo. */
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Bean
    public EvmCalculator evmCalculator() {
        return new EvmCalculator();
    }

    @Bean
    public ProjectService projectService(
            final ProjectRepositoryPort projectRepositoryPort,
            final ActivityRepositoryPort activityRepositoryPort,
            final EvmCalculator evmCalculator) {
        return new ProjectService(projectRepositoryPort, activityRepositoryPort, evmCalculator);
    }

    @Bean
    public ActivityService activityService(
            final ActivityRepositoryPort activityRepositoryPort,
            final ProjectRepositoryPort projectRepositoryPort,
            final EvmCalculator evmCalculator) {
        return new ActivityService(activityRepositoryPort, projectRepositoryPort, evmCalculator);
    }

    @Bean
    public ProjectEvmService projectEvmService(
            final ProjectRepositoryPort projectRepositoryPort,
            final ActivityRepositoryPort activityRepositoryPort,
            final EvmCalculator evmCalculator) {
        return new ProjectEvmService(projectRepositoryPort, activityRepositoryPort, evmCalculator);
    }

    @Bean
    public ProjectMeasurementService projectMeasurementService(
            final ProjectRepositoryPort projectRepositoryPort,
            final ActivityRepositoryPort activityRepositoryPort,
            final ProjectMeasurementRepositoryPort projectMeasurementRepositoryPort,
            final EvmCalculator evmCalculator,
            final Clock clock) {
        return new ProjectMeasurementService(
                projectRepositoryPort, activityRepositoryPort, projectMeasurementRepositoryPort, evmCalculator, clock);
    }
}
