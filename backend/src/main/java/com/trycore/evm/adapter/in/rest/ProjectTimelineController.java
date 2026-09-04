package com.trycore.evm.adapter.in.rest;

import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.trycore.evm.adapter.in.rest.dto.ProjectTimelineResponse;
import com.trycore.evm.adapter.in.rest.mapper.ProjectTimelineRestMapper;
import com.trycore.evm.application.port.in.ProjectMeasurementUseCases;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Traduce la petición de la serie temporal de un proyecto al caso de uso correspondiente.
 *
 * <p>Va en un controlador propio y no en {@code MeasurementController} porque su recurso es otro:
 * {@code /timeline} cuelga del proyecto, no de la colección de mediciones, y describe una vista
 * derivada y de solo lectura. Mezclarlos obligaría a que el controlador de mediciones declarara
 * una ruta absoluta ajena a su propio {@code @RequestMapping} y a agrupar en una sola etiqueta de
 * OpenAPI dos cosas que el cliente usa por separado: el registro de cortes y la gráfica.
 */
@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Serie temporal", description = "Evolución de los indicadores de un proyecto a lo largo de sus cortes")
public class ProjectTimelineController {

    private final ProjectMeasurementUseCases measurementUseCases;

    public ProjectTimelineController(final ProjectMeasurementUseCases measurementUseCases) {
        this.measurementUseCases = measurementUseCases;
    }

    @GetMapping("/{projectId}/timeline")
    @Operation(
            summary = "Consultar la serie temporal del proyecto",
            description = "Devuelve un punto por cada corte registrado, ordenados por fecha de la más "
                    + "antigua a la más reciente, con las cuatro cifras base y los indicadores ya "
                    + "calculados e interpretados. Es la respuesta que consume directamente una gráfica "
                    + "de líneas. Un proyecto sin cortes devuelve 200 con la lista de puntos vacía.")
    @ApiResponse(
            responseCode = "200",
            description = "Serie temporal del proyecto",
            content = @Content(schema = @Schema(implementation = ProjectTimelineResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ProjectTimelineResponse timeline(@PathVariable final Long projectId) {
        return ProjectTimelineRestMapper.toResponse(measurementUseCases.timeline(projectId));
    }
}
