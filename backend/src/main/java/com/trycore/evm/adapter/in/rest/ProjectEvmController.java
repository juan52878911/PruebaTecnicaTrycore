package com.trycore.evm.adapter.in.rest;

import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.trycore.evm.adapter.in.rest.dto.ProjectEvmSummaryResponse;
import com.trycore.evm.adapter.in.rest.mapper.ProjectEvmSummaryRestMapper;
import com.trycore.evm.application.port.in.ProjectEvmUseCase;
import com.trycore.evm.domain.model.EstimateFormula;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/** Traduce peticiones HTTP del análisis de Valor Ganado de un proyecto al caso de uso correspondiente. */
@RestController
@RequestMapping("/api/v1/projects")
@Tag(name = "Valor Ganado", description = "Análisis de Valor Ganado (EVM) consolidado de un proyecto")
public class ProjectEvmController {

    private final ProjectEvmUseCase projectEvmUseCase;

    public ProjectEvmController(final ProjectEvmUseCase projectEvmUseCase) {
        this.projectEvmUseCase = projectEvmUseCase;
    }

    @GetMapping("/{id}/evm")
    @Operation(
            summary = "Analizar Valor Ganado del proyecto",
            description = "Devuelve los indicadores de Valor Ganado consolidados del proyecto, calculados sobre "
                    + "la suma de BAC, PV, EV y AC de sus actividades, junto con los indicadores de cada "
                    + "actividad. El parámetro eacFormula elige con qué fórmula se calcula el EAC titular; "
                    + "las tres estimaciones estándar viajan siempre en la respuesta.")
    @ApiResponse(
            responseCode = "200",
            description = "Análisis de Valor Ganado del proyecto",
            content = @Content(schema = @Schema(implementation = ProjectEvmSummaryResponse.class)))
    @ApiResponse(
            responseCode = "400",
            description = "La fórmula de EAC indicada no existe",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(
            responseCode = "404",
            description = "No existe un proyecto con ese identificador",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    public ProjectEvmSummaryResponse analyze(
            @PathVariable final Long id,
            @Parameter(description = "Fórmula con la que calcular el EAC titular")
            @RequestParam(required = false) final EstimateFormula eacFormula) {
        return ProjectEvmSummaryRestMapper.toResponse(projectEvmUseCase.analyze(id, eacFormula));
    }
}
