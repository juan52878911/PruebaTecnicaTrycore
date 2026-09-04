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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.trycore.evm.adapter.in.rest.dto.ProjectRequest;
import com.trycore.evm.adapter.in.rest.dto.ProjectResponse;
import com.trycore.evm.adapter.in.rest.dto.ValidationProblemResponse;
import com.trycore.evm.adapter.in.rest.mapper.ProjectRestMapper;
import com.trycore.evm.application.port.in.ProjectUseCases;
import com.trycore.evm.domain.model.Project;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Traduce peticiones HTTP sobre proyectos a los casos de uso correspondientes, y viceversa. */
@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Proyectos", description = "Gestión de proyectos para el análisis de Valor Ganado")
public class ProjectController {

    private final ProjectUseCases projectUseCases;

    public ProjectController(final ProjectUseCases projectUseCases) {
        this.projectUseCases = projectUseCases;
    }

    @GetMapping
    @Operation(summary = "Listar proyectos", description = "Devuelve todos los proyectos registrados.")
    @ApiResponse(
            responseCode = "200",
            description = "Lista de proyectos",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = ProjectResponse.class))))
    public List<ProjectResponse> list() {
        return projectUseCases.list().stream().map(ProjectRestMapper::toResponse).toList();
    }

    @PostMapping
    @Operation(summary = "Crear proyecto", description = "Crea un proyecto nuevo con nombre y descripción.")
    @ApiResponse(
            responseCode = "201",
            description = "Proyecto creado",
            content = @Content(schema = @Schema(implementation = ProjectResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La petición contiene campos inválidos",
            content = @Content(schema = @Schema(implementation = ValidationProblemResponse.class)))
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody final ProjectRequest request) {
        final Project created = projectUseCases.create(request.name(), request.description());
        final ProjectResponse response = ProjectRestMapper.toResponse(created);
        return ResponseEntity.created(locationOf(created.id())).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener proyecto", description = "Devuelve un proyecto por su identificador.")
    @ApiResponse(
            responseCode = "200",
            description = "Proyecto encontrado",
            content = @Content(schema = @Schema(implementation = ProjectResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ProjectResponse get(@PathVariable final Long id) {
        return ProjectRestMapper.toResponse(projectUseCases.get(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar proyecto", description = "Actualiza el nombre y la descripción de un proyecto.")
    @ApiResponse(
            responseCode = "200",
            description = "Proyecto actualizado",
            content = @Content(schema = @Schema(implementation = ProjectResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La petición contiene campos inválidos",
            content = @Content(schema = @Schema(implementation = ValidationProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ProjectResponse update(@PathVariable final Long id, @Valid @RequestBody final ProjectRequest request) {
        return ProjectRestMapper.toResponse(projectUseCases.update(id, request.name(), request.description()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Eliminar proyecto",
            description = "Elimina un proyecto y, en cascada, todas sus actividades.")
    @ApiResponse(responseCode = "204", description = "Proyecto eliminado")
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public void delete(@PathVariable final Long id) {
        projectUseCases.delete(id);
    }

    /** Deriva la ubicación del recurso creado de la petición en curso, sin repetir la ruta base. */
    private static URI locationOf(final Long projectId) {
        return ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(projectId).toUri();
    }
}
