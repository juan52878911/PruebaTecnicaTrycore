package com.trycore.evm.adapter.in.rest;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pruebas de contrato de la política CORS configurada en {@code CorsConfig}.
 *
 * <p>El frontend se sirve desde un origen distinto al del backend, así que el navegador manda un
 * preflight antes de cada petición que no sea simple. Estas pruebas comprueban las dos mitades de
 * esa política: que el origen declarado en {@code application-test.yml} recibe permiso y que
 * cualquier otro no lo recibe.
 */
class CorsIT extends AbstractRestIntegrationTest {

    /** Origen declarado en el perfil test; debe coincidir con {@code evm.cors.allowed-origins}. */
    private static final String ALLOWED_ORIGIN = "http://localhost:4200";

    private static final String FORBIDDEN_ORIGIN = "http://malicioso.example";

    private static HttpHeaders preflightHeaders(final String origin, final String requestedMethod) {
        final HttpHeaders headers = new HttpHeaders();
        headers.setOrigin(origin);
        headers.setAccessControlRequestMethod(HttpMethod.valueOf(requestedMethod));
        return headers;
    }

    @Test
    void preflightFromAllowedOriginIsAccepted() {
        final ResponseEntity<Void> response = restTemplate.exchange(
                PROJECTS_PATH,
                HttpMethod.OPTIONS,
                new HttpEntity<>(preflightHeaders(ALLOWED_ORIGIN, "POST")),
                Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(ALLOWED_ORIGIN);
        assertThat(response.getHeaders().getAccessControlAllowMethods())
                .contains(HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE);
    }

    @Test
    void preflightFromForbiddenOriginIsRejected() {
        final ResponseEntity<Void> response = restTemplate.exchange(
                PROJECTS_PATH,
                HttpMethod.OPTIONS,
                new HttpEntity<>(preflightHeaders(FORBIDDEN_ORIGIN, "POST")),
                Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }

    @Test
    void simpleRequestFromAllowedOriginCarriesTheAllowOriginHeader() {
        final HttpHeaders headers = new HttpHeaders();
        headers.setOrigin(ALLOWED_ORIGIN);

        final ResponseEntity<Void> response = restTemplate.exchange(
                PROJECTS_PATH,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo(ALLOWED_ORIGIN);
    }

    @Test
    void simpleRequestFromForbiddenOriginDoesNotCarryTheAllowOriginHeader() {
        final HttpHeaders headers = new HttpHeaders();
        headers.setOrigin(FORBIDDEN_ORIGIN);

        final ResponseEntity<Void> response = restTemplate.exchange(
                PROJECTS_PATH,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Void.class);

        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
    }
}
