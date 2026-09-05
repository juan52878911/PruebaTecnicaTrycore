package com.trycore.evm.adapter.in.rest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ActivityResponse;
import com.trycore.evm.adapter.in.rest.dto.MilestoneRequest;
import com.trycore.evm.adapter.in.rest.dto.MilestoneResponse;
import com.trycore.evm.domain.model.MeasurementMethod;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de las actividades medidas por hitos ponderados, contra un PostgreSQL real
 * de Testcontainers.
 *
 * <p>Caso base: BAC 100.000, avance planificado 80 %, AC 75.000 y la tabla Diseño 20,
 * Construcción 50 y Pruebas 30. Los valores esperados están derivados a mano con las fórmulas del
 * estándar. Se consulta la base directamente donde hace falta comprobar lo que el API no muestra:
 * que el conjunto de hitos se reemplaza entero y que se borra en cascada con su actividad.
 */
class ActivityMilestonesIT extends AbstractRestIntegrationTest {

    private static final String PROJECT_NAME = "Proyecto con hitos";
    private static final String PROJECT_DESCRIPTION = "Descripción";
    private static final String ACTIVITY_NAME = "Obra civil";
    private static final String DESIGN = "Diseño";
    private static final String BUILD = "Construcción";
    private static final String TEST = "Pruebas";
    private static final String BUDGET = "100000";
    private static final String PLANNED_PERCENT = "80";
    private static final String ACTUAL_COST = "75000";
    private static final String ERRORS_PROPERTY = "errors";
    private static final String FIELD_PROPERTY = "field";
    private static final String ACTUAL_PROGRESS_FIELD = "actualProgressPercent";
    private static final String COUNT_MILESTONES_SQL =
            "SELECT count(*) FROM activity_milestones WHERE activity_id = ?";
    private static final String MILESTONE_NAMES_SQL =
            "SELECT name FROM activity_milestones WHERE activity_id = ? ORDER BY position";
    private static final LocalDate ACHIEVED_ON = LocalDate.parse("2026-03-15");
    private static final int FULL_TABLE_SIZE = 3;
    private static final int REPLACED_TABLE_SIZE = 2;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static String activitiesPath(final Long projectId) {
        return PROJECTS_PATH + "/" + projectId + "/activities";
    }

    private static MilestoneRequest milestone(final String name, final String weight, final boolean achieved) {
        return new MilestoneRequest(name, new BigDecimal(weight), achieved, achieved ? ACHIEVED_ON : null);
    }

    /** Tabla de referencia con el estado de cumplimiento que se indique en cada hito. */
    private static List<MilestoneRequest> referenceTable(
            final boolean designDone, final boolean buildDone, final boolean testDone) {
        return List.of(
                milestone(DESIGN, "20", designDone),
                milestone(BUILD, "50", buildDone),
                milestone(TEST, "30", testDone));
    }

    private static ActivityRequest milestoneRequest(final List<MilestoneRequest> milestones) {
        return new ActivityRequest(
                ACTIVITY_NAME, new BigDecimal(BUDGET), new BigDecimal(PLANNED_PERCENT), null,
                new BigDecimal(ACTUAL_COST), null, null, null, null,
                MeasurementMethod.WEIGHTED_MILESTONES, milestones);
    }

    private ActivityResponse createMilestoneActivity(final Long projectId, final List<MilestoneRequest> table) {
        final ActivityResponse created = restTemplate
                .postForEntity(activitiesPath(projectId), milestoneRequest(table), ActivityResponse.class)
                .getBody();
        assertThat(created).isNotNull();
        return created;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> errorsOf(final ResponseEntity<Map<String, Object>> response) {
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        return (List<Map<String, Object>>) problem.get(ERRORS_PROPERTY);
    }

    @Test
    void createDerivesProgressFromMilestonesAndCalculatesIndicators() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);

        final ResponseEntity<ActivityResponse> response = restTemplate.postForEntity(
                activitiesPath(projectId), milestoneRequest(referenceTable(true, true, false)),
                ActivityResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        final ActivityResponse body = response.getBody();
        assertThat(body).isNotNull();
        // Derivado = 20 (Diseño) + 50 (Construcción) = 70,00
        assertThat(body.derivedProgressPercent()).isEqualByComparingTo("70.00");
        assertThat(body.actualProgressPercent()).isEqualByComparingTo("70.00");
        assertThat(body.measurementMethod()).isEqualTo(MeasurementMethod.WEIGHTED_MILESTONES.name());
        assertThat(body.milestones()).extracting(MilestoneResponse::name).containsExactly(DESIGN, BUILD, TEST);
        // PV = 100.000 x 80 / 100 = 80.000; EV = 100.000 x 70 / 100 = 70.000
        assertThat(body.indicators().plannedValue()).isEqualByComparingTo("80000.00");
        assertThat(body.indicators().earnedValue()).isEqualByComparingTo("70000.00");
        // CPI = 70.000 / 75.000 = 0,9333; SPI = 70.000 / 80.000 = 0,8750
        assertThat(body.indicators().costPerformanceIndex()).isEqualByComparingTo("0.9333");
        assertThat(body.indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8750");
        // EAC = BAC x AC / EV = 100.000 x 75.000 / 70.000 = 107.142,86
        assertThat(body.indicators().estimateAtCompletion()).isEqualByComparingTo("107142.86");
    }

    @Test
    void sendingActualProgressWithMilestoneMethodReturns400NamingTheField() {
        // Aceptarlo e ignorarlo en silencio haría creer al cliente que fijó el avance.
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest request = new ActivityRequest(
                ACTIVITY_NAME, new BigDecimal(BUDGET), new BigDecimal(PLANNED_PERCENT), new BigDecimal("40"),
                new BigDecimal(ACTUAL_COST), null, null, null, null,
                MeasurementMethod.WEIGHTED_MILESTONES, referenceTable(true, true, false));

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(request), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorsOf(response))
                .anyMatch(error -> ACTUAL_PROGRESS_FIELD.equals(error.get(FIELD_PROPERTY)));
    }

    @Test
    void weightsThatDoNotAddUpToOneHundredReturn400() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityRequest request = milestoneRequest(
                List.of(milestone(DESIGN, "20", true), milestone(BUILD, "50", false)));

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(request), PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        final Map<String, Object> problem = response.getBody();
        assertThat(problem).isNotNull();
        // 20 + 50 = 70: el mensaje dice la suma obtenida para que el cliente sepa qué corregir.
        assertThat(String.valueOf(problem.get("detail"))).contains("suman 70");
    }

    @Test
    void missingMilestonesWithMilestoneMethodReturns400() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);

        final ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                activitiesPath(projectId), HttpMethod.POST, new HttpEntity<>(milestoneRequest(null)),
                PROBLEM_TYPE);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(errorsOf(response)).anyMatch(error -> "milestones".equals(error.get(FIELD_PROPERTY)));
    }

    @Test
    void updateReplacesTheWholeMilestoneTable() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityResponse created = createMilestoneActivity(projectId, referenceTable(true, true, false));

        final ActivityRequest replacement = milestoneRequest(
                List.of(milestone(DESIGN, "40", true), milestone(BUILD, "60", false)));
        final ResponseEntity<ActivityResponse> response = restTemplate.exchange(
                activitiesPath(projectId) + "/" + created.id(), HttpMethod.PUT,
                new HttpEntity<>(replacement), ActivityResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        final ActivityResponse body = response.getBody();
        assertThat(body).isNotNull();
        // Derivado tras el reemplazo = 40 (Diseño), frente al 70,00 anterior.
        assertThat(body.derivedProgressPercent()).isEqualByComparingTo("40.00");
        assertThat(body.milestones()).extracting(MilestoneResponse::name).containsExactly(DESIGN, BUILD);
        // La tabla anterior no sobrevive en la base: es un reemplazo, no una fusión.
        assertThat(jdbcTemplate.queryForObject(COUNT_MILESTONES_SQL, Long.class, created.id()))
                .isEqualTo(REPLACED_TABLE_SIZE);
        assertThat(jdbcTemplate.queryForList(MILESTONE_NAMES_SQL, String.class, created.id()))
                .containsExactly(DESIGN, BUILD);
    }

    @Test
    void changingTheMethodKeepsTheMilestones() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityResponse created = createMilestoneActivity(projectId, referenceTable(true, true, false));

        final ActivityRequest declaredProgress = new ActivityRequest(
                ACTIVITY_NAME, new BigDecimal(BUDGET), new BigDecimal(PLANNED_PERCENT), new BigDecimal("40"),
                new BigDecimal(ACTUAL_COST), null, null, null, null,
                MeasurementMethod.PERCENT_COMPLETE, null);
        final ResponseEntity<ActivityResponse> response = restTemplate.exchange(
                activitiesPath(projectId) + "/" + created.id(), HttpMethod.PUT,
                new HttpEntity<>(declaredProgress), ActivityResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        final ActivityResponse body = response.getBody();
        assertThat(body).isNotNull();
        // Los hitos siguen ahí y la respuesta dice qué regla manda, para poder atenuarlos en vez
        // de ocultarlos: cambiar de regla no es perder el trabajo declarado.
        assertThat(body.measurementMethod()).isEqualTo(MeasurementMethod.PERCENT_COMPLETE.name());
        assertThat(body.milestones()).hasSize(FULL_TABLE_SIZE);
        assertThat(body.derivedProgressPercent()).isNull();
        assertThat(body.actualProgressPercent()).isEqualByComparingTo("40.00");
        assertThat(jdbcTemplate.queryForObject(COUNT_MILESTONES_SQL, Long.class, created.id()))
                .isEqualTo(FULL_TABLE_SIZE);
    }

    @Test
    void deletingTheActivityDeletesItsMilestones() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        final ActivityResponse created = createMilestoneActivity(projectId, referenceTable(true, false, false));
        assertThat(jdbcTemplate.queryForObject(COUNT_MILESTONES_SQL, Long.class, created.id()))
                .isEqualTo(FULL_TABLE_SIZE);

        final ResponseEntity<Void> response = restTemplate.exchange(
                activitiesPath(projectId) + "/" + created.id(), HttpMethod.DELETE, null, Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(jdbcTemplate.queryForObject(COUNT_MILESTONES_SQL, Long.class, created.id())).isZero();
    }
}
