package com.trycore.evm.adapter.in.rest;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.trycore.evm.adapter.in.rest.dto.MeasurementRequest;
import com.trycore.evm.adapter.in.rest.dto.MeasurementResponse;
import com.trycore.evm.adapter.in.rest.dto.ValidationProblemResponse;
import com.trycore.evm.adapter.in.rest.mapper.MeasurementRestMapper;
import com.trycore.evm.application.port.in.ProjectMeasurementUseCases;
import com.trycore.evm.domain.model.ProjectMeasurement;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Traduce peticiones HTTP sobre el histórico de un proyecto a los casos de uso correspondientes, y viceversa. */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/measurements")
@Tag(
        name = "Histórico de mediciones",
        description = "Cortes que congelan las cifras de Valor Ganado de un proyecto en una fecha")
public class MeasurementController {

    private final ProjectMeasurementUseCases measurementUseCases;

    public MeasurementController(final ProjectMeasurementUseCases measurementUseCases) {
        this.measurementUseCases = measurementUseCases;
    }

    @GetMapping
    @Operation(
            summary = "Listar mediciones",
            description = "Devuelve los cortes registrados del proyecto, ordenados por fecha de corte "
                    + "de la más antigua a la más reciente. Cada corte trae las cifras congeladas del "
                    + "proyecto y de cada actividad; los indicadores se obtienen de la serie temporal.")
    @ApiResponse(
            responseCode = "200",
            description = "Lista de mediciones del proyecto",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = MeasurementResponse.class))))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public List<MeasurementResponse> list(@PathVariable final Long projectId) {
        return measurementUseCases.list(projectId).stream().map(MeasurementRestMapper::toResponse).toList();
    }

    @PostMapping
    @Operation(
            summary = "Registrar medición",
            description = "Congela el estado actual del proyecto en la fecha de corte indicada. Las cifras "
                    + "no se envían: se toman de las actividades tal como están en ese momento. La fecha no "
                    + "puede ser futura, porque un corte documenta lo que ya ocurrió, ni repetir la de otro "
                    + "corte del mismo proyecto.")
    @ApiResponse(
            responseCode = "201",
            description = "Medición registrada",
            content = @Content(schema = @Schema(implementation = MeasurementResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La petición contiene campos inválidos o la fecha de corte es futura",
            content = @Content(schema = @Schema(implementation = ValidationProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "409",
            description = "El proyecto ya tiene un corte en esa fecha",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<MeasurementResponse> create(
            @PathVariable final Long projectId, @Valid @RequestBody final MeasurementRequest request) {
        final ProjectMeasurement recorded =
                measurementUseCases.record(projectId, request.cutoffDate(), request.notes());
        return ResponseEntity.created(locationOf(recorded.id())).body(MeasurementRestMapper.toResponse(recorded));
    }

    @GetMapping("/{measurementId}")
    @Operation(
            summary = "Consultar medición",
            description = "Devuelve un corte concreto del proyecto con sus cifras congeladas.")
    @ApiResponse(
            responseCode = "200",
            description = "Medición solicitada",
            content = @Content(schema = @Schema(implementation = MeasurementResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe la medición en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public MeasurementResponse get(
            @PathVariable final Long projectId, @PathVariable final Long measurementId) {
        return MeasurementRestMapper.toResponse(measurementUseCases.get(projectId, measurementId));
    }

    @DeleteMapping("/{measurementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Eliminar medición",
            description = "Elimina un corte del histórico. Es la única forma de rectificarlo: una medición "
                    + "no se modifica, se borra y se vuelve a tomar.")
    @ApiResponse(responseCode = "204", description = "Medición eliminada")
    @ApiResponse(
            responseCode = "404",
            description = "No existe la medición en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public void delete(@PathVariable final Long projectId, @PathVariable final Long measurementId) {
        measurementUseCases.delete(projectId, measurementId);
    }

    /** Deriva la ubicación del recurso creado de la petición en curso, sin repetir la ruta base. */
    private static URI locationOf(final Long measurementId) {
        return ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(measurementId).toUri();
    }
}
