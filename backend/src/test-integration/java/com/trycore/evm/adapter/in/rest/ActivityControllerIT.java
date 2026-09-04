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
import org.springframework.http.ResponseEntity;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de {@link ActivityController} contra un PostgreSQL real de Testcontainers.
 * Cada prueba crea sus propios datos vía API: el perfil test no carga el seed de demostración.
 */
class ActivityControllerIT extends AbstractRestIntegrationTest {

    private static final String PROJECT_NAME = "Proyecto para actividades";
    private static final String PROJECT_DESCRIPTION = "Descripción";
    private static final Long MISSING_ID = 999_999L;
    private static final ParameterizedTypeReference<List<ActivityResponse>> ACTIVITY_LIST_TYPE =
            new ParameterizedTypeReference<List<ActivityResponse>>() {
            };

    private static String activitiesPath(final Long projectId) {
        return PROJECTS_PATH + "/" + projectId + "/activities";
    }

    private static ActivityRequest activityRequest(
            final String name, final String budget, final String planned, final String actual, final String cost) {
        return new ActivityRequest(
                name, new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost),
                null, null, null, null);
    }

    @Test
    void createReturns201WithLocationAndCalculatedIndicators() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest request =
                activityRequest("Diseño de arquitectura", "100000", "50", "40", "60000");

        final ResponseEntity<ActivityResponse> response =
                restTemplate.postForEntity(activitiesPath(projectId), request, ActivityResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        final ActivityResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.projectId()).isEqualTo(projectId);
        assertThat(body.indicators()).isNotNull();
        assertThat(body.indicators().costPerformanceIndex()).isEqualByComparingTo("0.6667");
        assertThat(body.indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8000");
        assertThat(body.indicators().costStatus().status()).isEqualTo("OVER_BUDGET");
    }

    @Test
    void updateThenListReflectsChanges() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityResponse created = restTemplate.postForEntity(
                activitiesPath(projectId),
                activityRequest("Actividad original", "100000", "50", "40", "60000"),
                ActivityResponse.class).getBody();
        assertThat(created).isNotNull();

        final ActivityRequest updateRequest =
                activityRequest("Actividad actualizada", "200000", "60", "60", "120000");
        final ResponseEntity<ActivityResponse> updateResponse = restTemplate.exchange(
                activitiesPath(projectId) + "/" + created.id(),
                HttpMethod.PUT,
                new HttpEntity<>(updateRequest),
                ActivityResponse.class);

        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody()).isNotNull();
        assertThat(updateResponse.getBody().name()).isEqualTo("Actividad actualizada");

        final ResponseEntity<List<ActivityResponse>> listResponse =
                restTemplate.exchange(activitiesPath(projectId), HttpMethod.GET, null, ACTIVITY_LIST_TYPE);
        assertThat(listResponse.getBody()).isNotNull();
        assertThat(listResponse.getBody()).anyMatch(activity -> "Actividad actualizada".equals(activity.name()));
    }

    @Test
    void deleteReturns204AndActivityDisappearsFromList() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityResponse created = restTemplate.postForEntity(
                activitiesPath(projectId),
                activityRequest("Actividad a eliminar", "100000", "50", "40", "60000"),
                ActivityResponse.class).getBody();
        assertThat(created).isNotNull();

        final ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                activitiesPath(projectId) + "/" + created.id(), HttpMethod.DELETE, null, Void.class);
        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        final ResponseEntity<List<ActivityResponse>> listResponse =
                restTemplate.exchange(activitiesPath(projectId), HttpMethod.GET, null, ACTIVITY_LIST_TYPE);
        assertThat(listResponse.getBody()).isNotNull();
        assertThat(listResponse.getBody()).noneMatch(activity -> activity.id().equals(created.id()));
    }

    @Test
    void deleteMissingActivityReturns404WithProblemDetail() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId) + "/" + MISSING_ID, HttpMethod.DELETE, null, PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createInMissingProjectReturns404WithProblemDetail() {
        final ActivityRequest request = activityRequest("Actividad huérfana", "100000", "50", "40", "60000");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(MISSING_ID), HttpMethod.POST, new HttpEntity<>(request), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void createWithProgressOver100Returns400WithFieldError() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest invalidRequest =
                activityRequest("Actividad inválida", "100000", "150", "40", "60000");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(invalidRequest), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        @SuppressWarnings("unchecked")
        final List<Map<String, Object>> errors = (List<Map<String, Object>>) problem.get("errors");
        assertThat(errors).anyMatch(error -> "plannedProgressPercent".equals(error.get("field")));
    }

    @Test
    void createWithMoreDecimalsThanStorableReturns400WithFieldError() {
        // La columna guarda dos decimales: aceptar 33.333 haría que la respuesta confirmara una
        // cifra distinta de la almacenada y que los indicadores no correspondieran a los datos.
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest invalidRequest =
                activityRequest("Actividad demasiado precisa", "1000", "33.333", "10", "10.005");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(invalidRequest), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        @SuppressWarnings("unchecked")
        final List<Map<String, Object>> errors = (List<Map<String, Object>>) problem.get("errors");
        assertThat(errors).anyMatch(error -> "plannedProgressPercent".equals(error.get("field")));
        assertThat(errors).anyMatch(error -> "actualCost".equals(error.get("field")));
    }

    @Test
    void createWithAmountLargerThanStorableReturns400InsteadOfServerError() {
        // Sin la restricción de dígitos, este valor llegaba a PostgreSQL, desbordaba la columna y
        // la respuesta era un 500 con la sentencia SQL en el cuerpo.
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest invalidRequest =
                activityRequest("Actividad desbordada", "999999999999999999", "50", "0", "0");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(invalidRequest), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        assertThat(problem).doesNotContainKey("trace");
        @SuppressWarnings("unchecked")
        final List<Map<String, Object>> errors = (List<Map<String, Object>>) problem.get("errors");
        assertThat(errors).anyMatch(error -> "budgetAtCompletion".equals(error.get("field")));
    }

    @Test
    void storedActivityMatchesTheOneReturnedOnCreation() {
        // El cuerpo del 201 y el de la lectura posterior deben coincidir campo por campo: es la
        // garantía de que nada se redondeó en silencio entre la respuesta y la base de datos.
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest request = activityRequest("Actividad exacta", "1000.55", "33.33", "10.01", "10.01");

        final ResponseEntity<ActivityResponse> created =
                restTemplate.postForEntity(activitiesPath(projectId), request, ActivityResponse.class);
        final ResponseEntity<ActivityResponse[]> listed =
                restTemplate.getForEntity(activitiesPath(projectId), ActivityResponse[].class);

        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final ActivityResponse createdBody = created.getBody();
        final ActivityResponse[] listedBody = listed.getBody();
        assertThat(createdBody).isNotNull();
        assertThat(listedBody).isNotNull().hasSize(1);
        assertThat(listedBody[0].budgetAtCompletion()).isEqualByComparingTo(createdBody.budgetAtCompletion());
        assertThat(listedBody[0].plannedProgressPercent())
                .isEqualByComparingTo(createdBody.plannedProgressPercent());
        assertThat(listedBody[0].actualProgressPercent()).isEqualByComparingTo(createdBody.actualProgressPercent());
        assertThat(listedBody[0].actualCost()).isEqualByComparingTo(createdBody.actualCost());
        assertThat(listedBody[0].indicators().plannedValue())
                .isEqualByComparingTo(createdBody.indicators().plannedValue());
    }

    @Test
    void createWithZeroActualCostReturnsNullCpiAndNotApplicableStatus() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest request = activityRequest("Actividad sin costo", "80000", "25", "0", "0");

        final ResponseEntity<ActivityResponse> response =
                restTemplate.postForEntity(activitiesPath(projectId), request, ActivityResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final ActivityResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.indicators().costPerformanceIndex()).isNull();
        assertThat(body.indicators().costStatus().status()).isEqualTo("NOT_APPLICABLE");
    }
}
