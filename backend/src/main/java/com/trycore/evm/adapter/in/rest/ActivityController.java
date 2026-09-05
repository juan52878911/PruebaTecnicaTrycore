package com.trycore.evm.adapter.in.rest;

import java.math.BigDecimal;
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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.adapter.in.rest.dto.MilestoneRequest;
import com.trycore.evm.adapter.in.rest.dto.ValidationProblemResponse;
import com.trycore.evm.adapter.in.rest.mapper.ActivityRestMapper;
import com.trycore.evm.application.port.in.ActivityUseCases;
import com.trycore.evm.domain.model.ActivityEvm;
import com.trycore.evm.domain.model.ActivityFigures;
import com.trycore.evm.domain.model.ActivitySchedule;
import com.trycore.evm.domain.model.Milestone;
import com.trycore.evm.domain.model.ProgressMeasurement;

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

    public ActivityController(final ActivityUseCases activityUseCases) {
        this.activityUseCases = activityUseCases;
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
        return activityUseCases.listByProject(projectId).stream().map(ActivityRestMapper::toResponse).toList();
    }

    @GetMapping("/{activityId}")
    @Operation(
            summary = "Obtener actividad",
            description = "Devuelve una actividad del proyecto con sus indicadores calculados. Es el recurso al "
                    + "que apunta la cabecera Location de la creación. El proyecto forma parte de la identidad "
                    + "de la búsqueda: una actividad que existe pero pertenece a otro proyecto devuelve 404.")
    @ApiResponse(
            responseCode = "200",
            description = "Actividad encontrada",
            content = @Content(schema = @Schema(implementation = ActivityResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe la actividad en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ActivityResponse get(@PathVariable final Long projectId, @PathVariable final Long activityId) {
        return ActivityRestMapper.toResponse(activityUseCases.get(projectId, activityId));
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
            content = @Content(schema = @Schema(implementation = ValidationProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ResponseEntity<ActivityResponse> create(
            @PathVariable final Long projectId, @Valid @RequestBody final ActivityRequest request) {
        final ActivityEvm created =
                activityUseCases.create(
                        projectId, request.name(), toFigures(request), toSchedule(request), toProgress(request));
        final ActivityResponse response = ActivityRestMapper.toResponse(created);
        return ResponseEntity.created(locationOf(created.activity().id())).body(response);
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
            content = @Content(schema = @Schema(implementation = ValidationProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe la actividad en ese proyecto",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ActivityResponse update(
            @PathVariable final Long projectId,
            @PathVariable final Long activityId,
            @Valid @RequestBody final ActivityRequest request) {
        final ActivityEvm updated = activityUseCases.update(
                projectId, activityId, request.name(), toFigures(request), toSchedule(request),
                toProgress(request));
        return ActivityRestMapper.toResponse(updated);
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

    /** Deriva la ubicación del recurso creado de la petición en curso, sin repetir la ruta base. */
    private static URI locationOf(final Long activityId) {
        return ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(activityId).toUri();
    }

    private static ProgressMeasurement toProgress(final ActivityRequest request) {
        return new ProgressMeasurement(request.measurementMethod(), toMilestones(request));
    }

    /** Una lista ausente no es una lista vacía: significa no tocar los hitos que ya existan. */
    private static List<Milestone> toMilestones(final ActivityRequest request) {
        if (request.milestones() == null) {
            return List.of();
        }
        return request.milestones().stream().map(ActivityController::toMilestone).toList();
    }

    private static Milestone toMilestone(final MilestoneRequest milestone) {
        return new Milestone(
                milestone.name(), milestone.weightPercent(), milestone.achieved(), milestone.achievedOn());
    }

    private static ActivitySchedule toSchedule(final ActivityRequest request) {
        return new ActivitySchedule(
                request.plannedStartDate(),
                request.plannedEndDate(),
                request.actualStartDate(),
                request.actualEndDate());
    }

    /**
     * Con la regla de hitos ponderados la petición no trae avance real, así que se parte de cero y
     * es la propia actividad la que lo sustituye por el que derivan sus hitos. La validación de
     * entrada ya garantiza que el campo solo falte en ese caso.
     */
    private static ActivityFigures toFigures(final ActivityRequest request) {
        final BigDecimal actualProgressPercent = request.actualProgressPercent() == null
                ? BigDecimal.ZERO
                : request.actualProgressPercent();
        return new ActivityFigures(
                request.budgetAtCompletion(),
                request.plannedProgressPercent(),
                actualProgressPercent,
                request.actualCost());
    }

}
