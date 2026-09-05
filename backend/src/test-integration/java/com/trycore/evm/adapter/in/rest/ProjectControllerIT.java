package com.trycore.evm.adapter.in.rest;

import java.math.BigDecimal;
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

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
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

    private static final String MANAGER = "Alicia Ramos";
    private static final String NEW_MANAGER = "Marcos Villalba";
    private static final String INDICATORS_QUERY = "?includeIndicators=true";

    // Cifras de las dos actividades que se crean para el listado con indicadores. El consolidado
    // esperado se deriva a mano de las fórmulas del estándar, no de la salida del código:
    //   PV = 100000 x 50/100 + 200000 x 25/100 =  50000 +  50000 = 100000
    //   EV = 100000 x 40/100 + 200000 x 30/100 =  40000 +  60000 = 100000
    //   AC = 60000 + 50000                                       = 110000
    //   BAC = 100000 + 200000                                    = 300000
    //   CPI = 100000 / 110000 = 0,909090... -> 0,9091 (escala 4, HALF_UP)
    //   SPI = 100000 / 100000 = 1,0000
    private static final String FIRST_BUDGET = "100000";
    private static final String FIRST_PLANNED_PERCENT = "50";
    private static final String FIRST_ACTUAL_PERCENT = "40";
    private static final String FIRST_ACTUAL_COST = "60000";
    private static final String SECOND_BUDGET = "200000";
    private static final String SECOND_PLANNED_PERCENT = "25";
    private static final String SECOND_ACTUAL_PERCENT = "30";
    private static final String SECOND_ACTUAL_COST = "50000";
    private static final String EXPECTED_BUDGET = "300000.00";
    private static final String EXPECTED_PLANNED_VALUE = "100000.00";
    private static final String EXPECTED_EARNED_VALUE = "100000.00";
    private static final String EXPECTED_ACTUAL_COST = "110000.00";
    private static final String EXPECTED_COST_INDEX = "0.9091";
    private static final String EXPECTED_SCHEDULE_INDEX = "1.0000";
    private static final String ZERO_AMOUNT = "0.00";
    private static final int EXPECTED_ACTIVITY_COUNT = 2;
    private static final int NO_ACTIVITIES = 0;

    private static ProjectRequest newProjectRequest(final String name, final String description) {
        return new ProjectRequest(name, description, null);
    }

    private void createActivity(
            final Long projectId,
            final String name,
            final String budget,
            final String plannedPercent,
            final String actualPercent,
            final String actualCost) {
        final ActivityRequest request = new ActivityRequest(
                name,
                new BigDecimal(budget),
                new BigDecimal(plannedPercent),
                new BigDecimal(actualPercent),
                new BigDecimal(actualCost),
                null, null, null, null, null, null);
        final ResponseEntity<ActivityResponse> response = restTemplate.postForEntity(
                PROJECTS_PATH + "/" + projectId + "/activities", request, ActivityResponse.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private ProjectResponse findInList(final String query, final Long projectId) {
        final ResponseEntity<List<ProjectResponse>> response =
                restTemplate.exchange(PROJECTS_PATH + query, HttpMethod.GET, null, PROJECT_LIST_TYPE);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        return response.getBody().stream()
                .filter(project -> projectId.equals(project.id()))
                .findFirst()
                .orElseThrow();
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

    @Test
    void listWithoutIndicatorsKeepsTheHistoricShape() {
        final Long projectId = createProject("Proyecto sin indicadores", "Descripción", MANAGER);
        createActivity(projectId, "Actividad", FIRST_BUDGET, FIRST_PLANNED_PERCENT, FIRST_ACTUAL_PERCENT,
                FIRST_ACTUAL_COST);

        final ProjectResponse project = findInList("", projectId);

        assertThat(project.activityCount()).isNull();
        assertThat(project.totals()).isNull();
        assertThat(project.indicators()).isNull();

        // El contrato de compatibilidad es sobre el JSON, no sobre el DTO: las tres propiedades
        // nuevas no deben aparecer siquiera como nulas cuando no se piden.
        final ResponseEntity<String> raw = restTemplate.getForEntity(PROJECTS_PATH, String.class);
        assertThat(raw.getBody()).isNotNull();
        assertThat(raw.getBody()).doesNotContain("activityCount", "\"totals\"", "\"indicators\"");
    }

    @Test
    void listWithIndicatorsIncludesCountTotalsAndConsolidatedIndicators() {
        final Long projectId = createProject("Proyecto con indicadores", "Descripción", MANAGER);
        createActivity(projectId, "Primera actividad", FIRST_BUDGET, FIRST_PLANNED_PERCENT,
                FIRST_ACTUAL_PERCENT, FIRST_ACTUAL_COST);
        createActivity(projectId, "Segunda actividad", SECOND_BUDGET, SECOND_PLANNED_PERCENT,
                SECOND_ACTUAL_PERCENT, SECOND_ACTUAL_COST);

        final ProjectResponse project = findInList(INDICATORS_QUERY, projectId);

        assertThat(project.manager()).isEqualTo(MANAGER);
        assertThat(project.activityCount()).isEqualTo(EXPECTED_ACTIVITY_COUNT);
        assertThat(project.totals()).isNotNull();
        assertThat(project.totals().budgetAtCompletion()).isEqualByComparingTo(EXPECTED_BUDGET);
        assertThat(project.totals().plannedValue()).isEqualByComparingTo(EXPECTED_PLANNED_VALUE);
        assertThat(project.totals().earnedValue()).isEqualByComparingTo(EXPECTED_EARNED_VALUE);
        assertThat(project.totals().actualCost()).isEqualByComparingTo(EXPECTED_ACTUAL_COST);
        assertThat(project.indicators()).isNotNull();
        assertThat(project.indicators().costPerformanceIndex()).isEqualByComparingTo(EXPECTED_COST_INDEX);
        assertThat(project.indicators().schedulePerformanceIndex()).isEqualByComparingTo(EXPECTED_SCHEDULE_INDEX);
        assertThat(project.indicators().costStatus().status()).isEqualTo("OVER_BUDGET");
        assertThat(project.indicators().scheduleStatus().status()).isEqualTo("ON_SCHEDULE");
    }

    @Test
    void listWithIndicatorsReturnsZeroesForProjectWithoutActivities() {
        final Long projectId = createProject("Proyecto vacío", null, null);

        final ProjectResponse project = findInList(INDICATORS_QUERY, projectId);

        assertThat(project.manager()).isNull();
        assertThat(project.activityCount()).isEqualTo(NO_ACTIVITIES);
        assertThat(project.totals()).isNotNull();
        assertThat(project.totals().budgetAtCompletion()).isEqualByComparingTo(ZERO_AMOUNT);
        assertThat(project.totals().plannedValue()).isEqualByComparingTo(ZERO_AMOUNT);
        assertThat(project.totals().earnedValue()).isEqualByComparingTo(ZERO_AMOUNT);
        assertThat(project.totals().actualCost()).isEqualByComparingTo(ZERO_AMOUNT);
        assertThat(project.indicators()).isNotNull();
        assertThat(project.indicators().costPerformanceIndex()).isNull();
        assertThat(project.indicators().schedulePerformanceIndex()).isNull();
        assertThat(project.indicators().costStatus().status()).isEqualTo("NOT_APPLICABLE");
        assertThat(project.indicators().scheduleStatus().status()).isEqualTo("NOT_APPLICABLE");
    }

    @Test
    void managerIsStoredOnCreationAndReplacedOnUpdate() {
        final Long projectId = createProject("Proyecto con responsable", "Descripción", MANAGER);

        final ResponseEntity<ProjectResponse> created =
                restTemplate.getForEntity(PROJECTS_PATH + "/" + projectId, ProjectResponse.class);
        assertThat(created.getBody()).isNotNull();
        assertThat(created.getBody().manager()).isEqualTo(MANAGER);

        final ResponseEntity<ProjectResponse> updated = restTemplate.exchange(
                PROJECTS_PATH + "/" + projectId,
                HttpMethod.PUT,
                new HttpEntity<>(new ProjectRequest("Proyecto con responsable", "Descripción", NEW_MANAGER)),
                ProjectResponse.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updated.getBody()).isNotNull();
        assertThat(updated.getBody().manager()).isEqualTo(NEW_MANAGER);

        final ResponseEntity<ProjectResponse> fetched =
                restTemplate.getForEntity(PROJECTS_PATH + "/" + projectId, ProjectResponse.class);
        assertThat(fetched.getBody()).isNotNull();
        assertThat(fetched.getBody().manager()).isEqualTo(NEW_MANAGER);
    }
}
