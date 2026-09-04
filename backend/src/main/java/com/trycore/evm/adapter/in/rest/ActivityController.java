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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.adapter.in.rest.mapper.ActivityRestMapper;
import com.trycore.evm.application.port.in.ActivityUseCases;
import com.trycore.evm.domain.model.Activity;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.service.EvmCalculator;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Traduce peticiones HTTP sobre actividades de un proyecto a los casos de uso correspondientes, y viceversa. */
@RestController
@RequestMapping("/api/v1/projects/{projectId}/activities")
@Tag(name = "Actividades", description = "Gestión de actividades de un proyecto y sus indicadores de Valor Ganado")
public class ActivityController {

    private final ActivityUseCases activityUseCases;
    private final EvmCalculator evmCalculator;

    public ActivityController(final ActivityUseCases activityUseCases, final EvmCalculator evmCalculator) {
        this.activityUseCases = activityUseCases;
        this.evmCalculator = evmCalculator;
    }

    @GetMapping
    @Operation(
            summary = "Listar actividades",
            description = "Devuelve las actividades de un proyecto, cada una con sus indicadores calculados.")
    @ApiResponse(
            responseCode = "200",
            description = "Lista de actividades",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = ActivityResponse.class))))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public List<ActivityResponse> list(@PathVariable final Long projectId) {
        return activityUseCases.listByProject(projectId).stream().map(this::toResponse).toList();
    }

    @PostMapping
    @Operation(
            summary = "Crear actividad",
            description = "Crea una actividad nueva dentro de un proyecto existente.")
    @ApiResponse(
            responseCode = "201",
            description = "Actividad creada",
            content = @Content(schema = @Schema(implementation = ActivityResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La petición contiene campos inválidos",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ActivityResponse> create(
            @PathVariable final Long projectId, @Valid @RequestBody final ActivityRequest request) {
        final Activity created = activityUseCases.create(projectId, request.name(), toFigures(request));
        final ActivityResponse response = toResponse(created);
        final URI location = URI.create("/api/v1/projects/" + projectId + "/activities/" + created.id());
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{activityId}")
    @Operation(summary = "Actualizar actividad", description = "Actualiza el nombre y las cifras de una actividad.")
    @ApiResponse(
            responseCode = "200",
            description = "Actividad actualizada",
            content = @Content(schema = @Schema(implementation = ActivityResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La petición contiene campos inválidos",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe la actividad en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ActivityResponse update(
            @PathVariable final Long projectId,
            @PathVariable final Long activityId,
            @Valid @RequestBody final ActivityRequest request) {
        final Activity updated = activityUseCases.update(projectId, activityId, request.name(), toFigures(request));
        return toResponse(updated);
    }

    @DeleteMapping("/{activityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Eliminar actividad", description = "Elimina una actividad de un proyecto.")
    @ApiResponse(responseCode = "204", description = "Actividad eliminada")
    @ApiResponse(
            responseCode = "404",
            description = "No existe la actividad en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public void delete(@PathVariable final Long projectId, @PathVariable final Long activityId) {
        activityUseCases.delete(projectId, activityId);
    }

    private static ActivityFigures toFigures(final ActivityRequest request) {
        return new ActivityFigures(
                request.budgetAtCompletion(),
                request.plannedProgressPercent(),
                request.actualProgressPercent(),
                request.actualCost());
    }

    private ActivityResponse toResponse(final Activity activity) {
        return ActivityRestMapper.toResponse(activity, evmCalculator.calculate(activity.figures()));
    }
}
