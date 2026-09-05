package com.trycore.evm.adapter.in.rest;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.trycore.evm.adapter.in.rest.dto.ActivityRequest;
import com.trycore.evm.adapter.in.rest.dto.ProjectEvmSummaryResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de {@link ProjectEvmController} contra un PostgreSQL real de Testcontainers.
 * Cada prueba crea sus propios datos vía API: el perfil test no carga el seed de demostración. Los
 * valores esperados de las cifras consolidadas están calculados a mano a partir de la fórmula, con
 * las mismas cifras de actividad que usa el seed de demostración del perfil dev.
 */
class ProjectEvmControllerIT extends AbstractRestIntegrationTest {

    private static final String PROJECT_NAME = "Plataforma de pagos";
    private static final String PROJECT_DESCRIPTION = "Descripción";
    private static final Long MISSING_PROJECT_ID = 999_999L;
    private static final int SEED_ACTIVITY_COUNT = 3;

    private void createActivity(
            final Long projectId,
            final String name,
            final String budget,
            final String planned,
            final String actual,
            final String cost) {
        final ActivityRequest request = new ActivityRequest(
                name, new BigDecimal(budget), new BigDecimal(planned), new BigDecimal(actual), new BigDecimal(cost),
                null, null, null, null, null);
        final ResponseEntity<Void> response = restTemplate.postForEntity(
                PROJECTS_PATH + "/" + projectId + "/activities", request, Void.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void evmOfProjectWithoutActivitiesReturns200WithNullIndicators() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);

        final ResponseEntity<ProjectEvmSummaryResponse> response = restTemplate.getForEntity(
                PROJECTS_PATH + "/" + projectId + "/evm", ProjectEvmSummaryResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        final ProjectEvmSummaryResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.budgetAtCompletion()).isEqualByComparingTo("0.00");
        assertThat(body.indicators().costPerformanceIndex()).isNull();
        assertThat(body.indicators().schedulePerformanceIndex()).isNull();
        assertThat(body.indicators().costStatus().status()).isEqualTo("NOT_APPLICABLE");
        assertThat(body.indicators().scheduleStatus().status()).isEqualTo("NOT_APPLICABLE");
        assertThat(body.activities()).isEmpty();
    }

    @Test
    void evmOfProjectWithSeedActivitiesMatchesHandComputedConsolidation() {
        final Long projectId = createProject(PROJECT_NAME, PROJECT_DESCRIPTION);
        createActivity(projectId, "Diseño de arquitectura", "100000", "50", "40", "60000");
        createActivity(projectId, "Desarrollo del API", "250000", "40", "45", "100000");
        createActivity(projectId, "Pruebas de integración", "80000", "25", "0", "0");

        final ResponseEntity<ProjectEvmSummaryResponse> response = restTemplate.getForEntity(
                PROJECTS_PATH + "/" + projectId + "/evm", ProjectEvmSummaryResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        final ProjectEvmSummaryResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.activities()).hasSize(SEED_ACTIVITY_COUNT);

        // Cálculo a mano, sobre las sumas de las tres actividades:
        // BAC total = 100000 + 250000 + 80000 = 430000
        // PV total = 50000 + 100000 + 20000 = 170000
        // EV total = 40000 + 112500 + 0 = 152500
        // AC total = 60000 + 100000 + 0 = 160000
        // CPI = 152500 / 160000 = 0.953125 -> 0.9531
        // SPI = 152500 / 170000 = 0.897058... -> 0.8971
        // EAC = 430000 x 160000 / 152500 = 451147.540983... -> 451147.54
        // VAC = 430000 - 451147.54 = -21147.54
        assertThat(body.budgetAtCompletion()).isEqualByComparingTo("430000.00");
        assertThat(body.indicators().plannedValue()).isEqualByComparingTo("170000.00");
        assertThat(body.indicators().earnedValue()).isEqualByComparingTo("152500.00");
        assertThat(body.indicators().actualCost()).isEqualByComparingTo("160000.00");
        assertThat(body.indicators().costPerformanceIndex()).isEqualByComparingTo("0.9531");
        assertThat(body.indicators().schedulePerformanceIndex()).isEqualByComparingTo("0.8971");
        assertThat(body.indicators().estimateAtCompletion()).isEqualByComparingTo("451147.54");
        assertThat(body.indicators().varianceAtCompletion()).isEqualByComparingTo("-21147.54");
    }

    @Test
    void evmOfMissingProjectReturns404() {
        final ResponseEntity<String> response =
                restTemplate.getForEntity(PROJECTS_PATH + "/" + MISSING_PROJECT_ID + "/evm", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
