package com.trycore.evm.adapter.in.rest;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import com.trycore.evm.adapter.in.rest.dto.ProjectRequest;
import com.trycore.evm.adapter.in.rest.dto.ProjectResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de {@link ProjectController} contra un PostgreSQL real de Testcontainers.
 * Cada prueba crea sus propios datos vía API: el perfil test no carga el seed de demostración.
 */
class ProjectControllerIT extends AbstractRestIntegrationTest {

    private static final ParameterizedTypeReference<List<ProjectResponse>> PROJECT_LIST_TYPE =
            new ParameterizedTypeReference<List<ProjectResponse>>() {
            };

    private static ProjectRequest newProjectRequest(final String name, final String description) {
        return new ProjectRequest(name, description);
    }

    @Test
    void createReturns201WithLocationAndBody() {
        final ProjectRequest request = newProjectRequest("Proyecto de prueba", "Descripción de prueba");

        final ResponseEntity<ProjectResponse> response =
                restTemplate.postForEntity(PROJECTS_PATH, request, ProjectResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        final ProjectResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.id()).isNotNull();
        assertThat(body.name()).isEqualTo("Proyecto de prueba");
        assertThat(body.description()).isEqualTo("Descripción de prueba");
        assertThat(body.createdAt()).isNotNull();
        assertThat(body.updatedAt()).isNotNull();

        final ResponseEntity<ProjectResponse> fetched = restTemplate.getForEntity(location, ProjectResponse.class);
        assertThat(fetched.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fetched.getBody()).isNotNull();
        assertThat(fetched.getBody().id()).isEqualTo(body.id());
    }

    @Test
    void updateThenGetReflectsChanges() {
        final Long projectId = createProject("Proyecto original", "Descripción original");

        final ProjectRequest updateRequest = newProjectRequest("Proyecto actualizado", "Descripción actualizada");
        final ResponseEntity<ProjectResponse> updateResponse = restTemplate.exchange(
                PROJECTS_PATH + "/" + projectId,
                HttpMethod.PUT,
                new HttpEntity<>(updateRequest),
                ProjectResponse.class);

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody()).isNotNull();
        assertThat(updateResponse.getBody().name()).isEqualTo("Proyecto actualizado");
        assertThat(updateResponse.getBody().description()).isEqualTo("Descripción actualizada");

        final ResponseEntity<ProjectResponse> getResponse =
                restTemplate.getForEntity(PROJECTS_PATH + "/" + projectId, ProjectResponse.class);
        assertThat(getResponse.getBody()).isNotNull();
        assertThat(getResponse.getBody().name()).isEqualTo("Proyecto actualizado");
    }

    @Test
    void deleteReturns204ThenGetReturns404WithProblemDetail() {
        final Long projectId = createProject("Proyecto a eliminar", null);

        final ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                PROJECTS_PATH + "/" + projectId, HttpMethod.DELETE, null, Void.class);
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        final ResponseEntity<Map<String, Object>> getResponse = restTemplate.exchange(
                PROJECTS_PATH + "/" + projectId, HttpMethod.GET, null, PROBLEM_TYPE);
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(getResponse.getHeaders().getContentType())
                .isEqualTo(MediaType.valueOf("application/problem+json"));
        final Map<String, Object> problem = getResponse.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.get("status")).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(problem.get("detail")).asString().contains(String.valueOf(projectId));
    }

    @Test
    void listIncludesCreatedProjects() {
        createProject("Proyecto listado", "Descripción");

        final ResponseEntity<List<ProjectResponse>> response =
                restTemplate.exchange(PROJECTS_PATH, HttpMethod.GET, null, PROJECT_LIST_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).anyMatch(project -> "Proyecto listado".equals(project.name()));
    }

    @Test
    void createWithBlankNameReturns400WithFieldError() {
        final ProjectRequest invalidRequest = newProjectRequest("", "Descripción");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                PROJECTS_PATH, HttpMethod.POST, new HttpEntity<>(invalidRequest), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem.get("detail")).isEqualTo("La petición contiene campos inválidos");
        @SuppressWarnings("unchecked")
        final List<Map<String, Object>> errors = (List<Map<String, Object>>) problem.get("errors");
        assertThat(errors).anyMatch(error -> "name".equals(error.get("field")));
    }
}
