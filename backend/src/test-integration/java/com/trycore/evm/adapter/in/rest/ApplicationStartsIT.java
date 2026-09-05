package com.trycore.evm.adapter.in.rest;

import java.util.Iterator;
import java.util.Map;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de integración de arranque: levanta el contexto completo de Spring Boot contra un
 * PostgreSQL real de Testcontainers, comprueba que Flyway aplicó la migración V1 y que la
 * documentación OpenAPI queda expuesta.
 */
class ApplicationStartsIT extends AbstractRestIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void contextLoadsAndFlywayAppliesFirstMigration() {
        final Integer appliedMigrations = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND success = true",
                Integer.class);

        assertThat(appliedMigrations).isEqualTo(1);
    }

    @Test
    void flywayCreatesTheProjectsTable() {
        final Integer projectsTableExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'projects'",
                Integer.class);

        assertThat(projectsTableExists).isEqualTo(1);
    }

    @Test
    void apiDocsRespondsWithJson() {
        final ResponseEntity<String> response = restTemplate.getForEntity("/api-docs", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(Objects.requireNonNull(response.getHeaders().getContentType()).isCompatibleWith(
                MediaType.APPLICATION_JSON)).isTrue();
    }

    @Test
    void swaggerUiIsReachable() {
        final ResponseEntity<String> response = restTemplate.getForEntity("/swagger-ui", String.class);

        assertThat(response.getStatusCode().is3xxRedirection() || response.getStatusCode().is2xxSuccessful())
                .isTrue();
    }

    @Test
    void apiDocsDescribesEveryContractOperation() throws Exception {
        // 5 de proyectos, 1 de análisis EVM, 5 de actividades, 4 del histórico y 1 de serie temporal.
        final int expectedOperationCount = 16;
        final String body = restTemplate.getForEntity("/api-docs", String.class).getBody();

        final JsonNode paths = new ObjectMapper().readTree(body).path("paths");
        int operationCount = 0;
        final Iterator<Map.Entry<String, JsonNode>> pathEntries = paths.fields();
        while (pathEntries.hasNext()) {
            operationCount += pathEntries.next().getValue().size();
        }

        assertThat(operationCount).isEqualTo(expectedOperationCount);
    }
}
