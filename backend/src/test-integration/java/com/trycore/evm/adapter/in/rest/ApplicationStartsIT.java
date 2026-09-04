package com.trycore.evm.adapter.in.rest;

import java.util.Iterator;
import java.util.Map;
import java.util.Objects;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prueba de integración de arranque: levanta el contexto completo de Spring Boot contra un
 * PostgreSQL real de Testcontainers, comprueba que Flyway aplicó la migración V1 y que la
 * documentación OpenAPI queda expuesta.
 */
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestRestTemplate
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApplicationStartsIT {

    private static final String POSTGRES_IMAGE = "postgres:16-alpine";

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE);

    @Autowired
    private TestRestTemplate restTemplate;

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
    void apiDocsDescribesTheTenContractOperations() throws Exception {
        final int expectedOperationCount = 10;
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
