package com.trycore.evm.adapter.in.rest;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.adapter.in.rest.dto.MeasurementRequest;
import com.trycore.evm.adapter.in.rest.dto.MeasurementResponse;
import com.trycore.evm.adapter.in.rest.dto.ProjectTimelineResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de {@link MeasurementController} y {@link ProjectTimelineController} contra
 * un PostgreSQL real de Testcontainers. Cada prueba crea sus propios datos vía API: el perfil test
 * no carga el seed de demostración.
 *
 * <p>Los indicadores esperados están derivados a mano de la fórmula y escritos literalmente,
 * nunca copiados de la respuesta del servicio.
 */
class MeasurementControllerIT extends AbstractRestIntegrationTest {

    private static final String PROJECT_NAME = "Proyecto con histórico";
    private static final String PROJECT_DESCRIPTION = "Descripción";
    private static final String ACTIVITY_NAME = "Diseño de arquitectura";
    private static final Long MISSING_ID = 999_999L;
    private static final int DAYS_BEFORE_FIRST_CUTOFF = 14;
    private static final int DAYS_BEFORE_SECOND_CUTOFF = 7;

    /**
     * Las fechas se calculan desde el día de ejecución en vez de fijarse. El API rechaza los cortes
     * futuros, así que una fecha fija haría fallar la prueba en cuanto se ejecutara con el reloj del
     * sistema por detrás de ella.
     */
    private static final LocalDate FIRST_CUTOFF = LocalDate.now().minusDays(DAYS_BEFORE_FIRST_CUTOFF);
    private static final LocalDate SECOND_CUTOFF = LocalDate.now().minusDays(DAYS_BEFORE_SECOND_CUTOFF);
    private static final int TWO_POINTS = 2;
    private static final String COUNT_MEASUREMENTS_SQL =
            "SELECT count(*) FROM project_measurements WHERE project_id = ?";
    private static final String COUNT_MEASUREMENT_LINES_SQL =
            "SELECT count(*) FROM project_measurement_activities l "
                    + "JOIN project_measurements m ON m.id = l.measurement_id WHERE m.project_id = ?";
    private static final ParameterizedTypeReference<List<MeasurementResponse>> MEASUREMENT_LIST_TYPE =
            new ParameterizedTypeReference<List<MeasurementResponse>>() {
            };

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static String measurementsPath(final Long projectId) {
        return PROJECTS_PATH + "/" + projectId + "/measurements";
    }

    private static String timelinePath(final Long projectId) {
        return PROJECTS_PATH + "/" + projectId + "/timeline";
    }

    private static String activitiesPath(final Long projectId) {
        return PROJECTS_PATH + "/" + projectId + "/activities";
    }

    private static ActivityRequest activityRequest(
            final String budget, final String planned, final String actual, final String cost) {
        return new ActivityRequest(
                ACTIVITY_NAME, new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual),
                new BigDecimal(cost), null, null, null, null, null);
    }

    /** Proyecto con una actividad de BAC 100.000, avance planificado 50 %, real 40 % y costo 60.000. */
    private Long projectWithReferenceActivity() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        restTemplate.postForEntity(
                activitiesPath(projectId), activityRequest("100000", "50", "40", "60000"), ActivityResponse.class);
        return projectId;
    }

    private MeasurementResponse record(final Long projectId, final LocalDate cutoffDate, final String notes) {
        final MeasurementResponse body = restTemplate.postForEntity(
                measurementsPath(projectId), new MeasurementRequest(cutoffDate, notes), MeasurementResponse.class)
                .getBody();
        assertThat(body).isNotNull();
        return body;
    }

    @Test
    void recordReturns201WithLocationAndFrozenFigures() {
        final Long projectId = projectWithReferenceActivity();

        final ResponseEntity<MeasurementResponse> response = restTemplate.postForEntity(
                measurementsPath(projectId),
                new MeasurementRequest(FIRST_CUTOFF, "Cierre de la semana 1"),
                MeasurementResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        final MeasurementResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(location.getPath()).endsWith(measurementsPath(projectId) + "/" + body.id());
        assertThat(body.projectId()).isEqualTo(projectId);
        assertThat(body.cutoffDate()).isEqualTo(FIRST_CUTOFF);
        assertThat(body.notes()).isEqualTo("Cierre de la semana 1");
        // PV = 0,50 x 100.000 = 50.000; EV = 0,40 x 100.000 = 40.000; AC = 60.000
        assertThat(body.totals().budgetAtCompletion()).isEqualByComparingTo("100000.00");
        assertThat(body.totals().plannedValue()).isEqualByComparingTo("50000.00");
        assertThat(body.totals().earnedValue()).isEqualByComparingTo("40000.00");
        assertThat(body.totals().actualCost()).isEqualByComparingTo("60000.00");
        assertThat(body.activities()).hasSize(1);
        assertThat(body.activities().get(0).activityName()).isEqualTo(ACTIVITY_NAME);
        assertThat(body.createdAt()).isNotNull();
    }

    @Test
    void getAndListReturnTheStoredMeasurement() {
        final Long projectId = projectWithReferenceActivity();
        final MeasurementResponse created = record(projectId, FIRST_CUTOFF, "Cierre de la semana 1");

        final ResponseEntity<MeasurementResponse> single = restTemplate.getForEntity(
                measurementsPath(projectId) + "/" + created.id(), MeasurementResponse.class);
        final ResponseEntity<List<MeasurementResponse>> listed = restTemplate.exchange(
                measurementsPath(projectId), HttpMethod.GET, null, MEASUREMENT_LIST_TYPE);

        assertThat(single.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(single.getBody()).isNotNull();
        assertThat(single.getBody().id()).isEqualTo(created.id());
        assertThat(single.getBody().totals().earnedValue()).isEqualByComparingTo("40000.00");
        assertThat(listed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listed.getBody()).isNotNull().hasSize(1);
        assertThat(listed.getBody().get(0).id()).isEqualTo(created.id());
    }

    @Test
    void timelineReturnsBothCutoffsOrderedWithCalculatedIndicators() {
        final Long projectId = projectWithReferenceActivity();
        final ActivityResponse[] activities =
                restTemplate.getForEntity(activitiesPath(projectId), ActivityResponse[].class).getBody();
        assertThat(activities).isNotNull().hasSize(1);

        // El corte de la semana 2 se registra primero a propósito, y con otras cifras: la serie debe
        // ordenarlo por fecha de corte, no por orden de registro, y cada punto debe conservar las
        // cifras que tenía la actividad cuando se tomó.
        restTemplate.put(
                activitiesPath(projectId) + "/" + activities[0].id(), activityRequest("100000", "80", "70", "80000"));
        record(projectId, SECOND_CUTOFF, "Cierre de la semana 2");
        restTemplate.put(
                activitiesPath(projectId) + "/" + activities[0].id(), activityRequest("100000", "50", "40", "60000"));
        record(projectId, FIRST_CUTOFF, "Cierre de la semana 1");

        final ResponseEntity<ProjectTimelineResponse> response =
                restTemplate.getForEntity(timelinePath(projectId), ProjectTimelineResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        final ProjectTimelineResponse timeline = response.getBody();
        assertThat(timeline).isNotNull();
        assertThat(timeline.project().id()).isEqualTo(projectId);
        assertThat(timeline.points()).hasSize(TWO_POINTS);
        assertThat(timeline.points().get(0).cutoffDate()).isEqualTo(FIRST_CUTOFF);
        assertThat(timeline.points().get(1).cutoffDate()).isEqualTo(SECOND_CUTOFF);
        assertThat(timeline.points().get(0).notes()).isEqualTo("Cierre de la semana 1");

        // Semana 1 sobre un BAC de 100.000: PV = 0,50 x 100.000 = 50.000; EV = 0,40 x 100.000 = 40.000;
        // AC = 60.000. CPI = 40.000 / 60.000 = 0,6667; SPI = 40.000 / 50.000 = 0,8000
        // CV = 40.000 - 60.000 = -20.000; SV = 40.000 - 50.000 = -10.000
        // EAC = 100.000 x 60.000 / 40.000 = 150.000; VAC = 100.000 - 150.000 = -50.000
        assertThat(timeline.points().get(0).totals().plannedValue()).isEqualByComparingTo("50000.00");
        assertThat(timeline.points().get(0).totals().earnedValue()).isEqualByComparingTo("40000.00");
        assertThat(timeline.points().get(0).indicators().costPerformanceIndex()).isEqualByComparingTo("0.6667");
        assertThat(timeline.points().get(0).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8000");
        assertThat(timeline.points().get(0).indicators().costVariance()).isEqualByComparingTo("-20000.00");
        assertThat(timeline.points().get(0).indicators().scheduleVariance()).isEqualByComparingTo("-10000.00");
        assertThat(timeline.points().get(0).indicators().estimateAtCompletion()).isEqualByComparingTo("150000.00");
        assertThat(timeline.points().get(0).indicators().varianceAtCompletion()).isEqualByComparingTo("-50000.00");
        assertThat(timeline.points().get(0).indicators().costStatus().status()).isEqualTo("OVER_BUDGET");
        assertThat(timeline.points().get(0).indicators().scheduleStatus().status()).isEqualTo("BEHIND_SCHEDULE");

        // Semana 2: PV = 0,80 x 100.000 = 80.000; EV = 0,70 x 100.000 = 70.000; AC = 80.000
        // CPI = 70.000 / 80.000 = 0,8750; SPI = 70.000 / 80.000 = 0,8750
        // EAC = 100.000 x 80.000 / 70.000 = 114.285,71; VAC = 100.000 - 114.285,71 = -14.285,71
        assertThat(timeline.points().get(1).totals().earnedValue()).isEqualByComparingTo("70000.00");
        assertThat(timeline.points().get(1).indicators().costPerformanceIndex()).isEqualByComparingTo("0.8750");
        assertThat(timeline.points().get(1).indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8750");
        assertThat(timeline.points().get(1).indicators().estimateAtCompletion()).isEqualByComparingTo("114285.71");
        assertThat(timeline.points().get(1).indicators().varianceAtCompletion()).isEqualByComparingTo("-14285.71");
    }

    @Test
    void timelineOfProjectWithoutMeasurementsReturns200WithNoPoints() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);

        final ResponseEntity<ProjectTimelineResponse> response =
                restTemplate.getForEntity(timelinePath(projectId), ProjectTimelineResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().points()).isEmpty();
    }

    @Test
    void secondMeasurementOnTheSameDateReturns409() {
        final Long projectId = projectWithReferenceActivity();
        record(projectId, FIRST_CUTOFF, "Cierre de la semana 1");

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                measurementsPath(projectId),
                HttpMethod.POST,
                new HttpEntity<>(new MeasurementRequest(FIRST_CUTOFF, "Corte repetido")),
                PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(String.valueOf(response.getBody().get("detail"))).contains(FIRST_CUTOFF.toString());
    }

    @Test
    void measurementWithFutureCutoffReturns400() {
        final Long projectId = projectWithReferenceActivity();

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                measurementsPath(projectId),
                HttpMethod.POST,
                new HttpEntity<>(new MeasurementRequest(LocalDate.now().plusDays(1), "Previsión")),
                PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(String.valueOf(response.getBody().get("detail"))).contains("no puede ser futura");
    }

    @Test
    void measurementWithoutCutoffDateReturns400WithFieldError() {
        final Long projectId = projectWithReferenceActivity();

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                measurementsPath(projectId),
                HttpMethod.POST,
                new HttpEntity<>(new MeasurementRequest(null, "Sin fecha")),
                PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        @SuppressWarnings("unchecked")
        final List<Map<String, Object>> errors = (List<Map<String, Object>>) problem.get("errors");
        assertThat(errors).anyMatch(error -> "cutoffDate".equals(error.get("field")));
    }

    @Test
    void deleteReturns204AndMeasurementDisappearsFromTheTimeline() {
        final Long projectId = projectWithReferenceActivity();
        final MeasurementResponse created = record(projectId, FIRST_CUTOFF, "Cierre de la semana 1");

        final ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                measurementsPath(projectId) + "/" + created.id(), HttpMethod.DELETE, null, Void.class);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        final ResponseEntity<ProjectTimelineResponse> timeline =
                restTemplate.getForEntity(timelinePath(projectId), ProjectTimelineResponse.class);
        assertThat(timeline.getBody()).isNotNull();
        assertThat(timeline.getBody().points()).isEmpty();
        assertThat(countMeasurementLines(projectId)).isZero();
    }

    @Test
    void getMissingMeasurementReturns404WithProblemDetail() {
        final Long projectId = projectWithReferenceActivity();

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                measurementsPath(projectId) + "/" + MISSING_ID, HttpMethod.GET, null, PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listInMissingProjectReturns404WithProblemDetail() {
        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                measurementsPath(MISSING_ID), HttpMethod.GET, null, PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deletingTheProjectDeletesItsMeasurementsInCascade() {
        final Long projectId = projectWithReferenceActivity();
        record(projectId, FIRST_CUTOFF, "Cierre de la semana 1");
        assertThat(countMeasurements(projectId)).isEqualTo(1);
        assertThat(countMeasurementLines(projectId)).isEqualTo(1);

        final ResponseEntity<Void> deleteResponse =
                restTemplate.exchange(PROJECTS_PATH + "/" + projectId, HttpMethod.DELETE, null, Void.class);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        // Sin API que consultar tras borrar el proyecto, la cascada se comprueba en la tabla.
        assertThat(countMeasurements(projectId)).isZero();
        assertThat(countMeasurementLines(projectId)).isZero();
    }

    private long countMeasurements(final Long projectId) {
        return count(COUNT_MEASUREMENTS_SQL, projectId);
    }

    private long countMeasurementLines(final Long projectId) {
        return count(COUNT_MEASUREMENT_LINES_SQL, projectId);
    }

    private long count(final String sql, final Long projectId) {
        final Long rows = jdbcTemplate.queryForObject(sql, Long.class, projectId);
        return rows == null ? 0L : rows;
    }
}
