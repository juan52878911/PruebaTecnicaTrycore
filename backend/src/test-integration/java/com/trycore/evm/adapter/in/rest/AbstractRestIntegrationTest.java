package com.trycore.evm.adapter.in.rest;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;

import com.trycore.evm.adapter.in.rest.dto.ProjectRequest;
import com.trycore.evm.adapter.in.rest.dto.ProjectResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Base común de las pruebas de contrato REST: concentra la pila de anotaciones de Spring Boot,
 * el contenedor de PostgreSQL, el tipo de respuesta de los errores RFC 7807 y las ayudas de
 * creación de datos que antes se repetían en cada clase de integración.
 *
 * <p>El contenedor es un único {@code static} compartido por todas las subclases y se arranca
 * una sola vez, en el inicializador estático de esta clase. Es el patrón de contenedor
 * singleton de Testcontainers, y aquí es deliberado por tres motivos:</p>
 *
 * <ul>
 *   <li>Arrancar PostgreSQL cuesta cerca de un segundo por contenedor. Con una clase base que
 *       lo declare y cuatro clases de integración que lo hereden, la suite paga ese coste una
 *       vez en lugar de cuatro.</li>
 *   <li>No se usan {@code @Testcontainers} ni {@code @Container}: esa extensión guarda el
 *       contenedor en el almacén de la clase de prueba y lo detiene en su {@code afterAll}, de
 *       modo que cada subclase levantaría el suyo. El arranque explícito evita ese ciclo.</li>
 *   <li>Al ser siempre la misma instancia, la clave de caché del contexto de Spring coincide
 *       para las cuatro subclases y el contexto de aplicación también se reutiliza.</li>
 * </ul>
 *
 * <p>El contenedor no se detiene a mano: el contenedor de vigilancia Ryuk de Testcontainers lo
 * elimina al terminar la JVM de pruebas.</p>
 *
 * <p>Como cada subclase comparte base de datos, ninguna prueba puede depender del estado global:
 * todas crean sus propios proyectos y actividades vía API. El perfil {@code test} no carga el
 * seed de demostración.</p>
 */
@ActiveProfiles("test")
@AutoConfigureTestRestTemplate
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class AbstractRestIntegrationTest {

    /** Raíz de los recursos de proyecto, base de todas las rutas que ejercitan las pruebas. */
    protected static final String PROJECTS_PATH = "/api/v1/projects";

    /** Tipo del cuerpo de los errores en formato RFC 7807 que devuelve el manejador global. */
    protected static final ParameterizedTypeReference<Map<String, Object>> PROBLEM_TYPE =
            new ParameterizedTypeReference<Map<String, Object>>() {
            };

    private static final String POSTGRES_IMAGE = "postgres:16-alpine";

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE);

    static {
        POSTGRES.start();
    }

    @Autowired
    protected TestRestTemplate restTemplate;

    /**
     * Crea un proyecto sin responsable a través de la API y devuelve su identificador.
     *
     * @param name        nombre del proyecto
     * @param description descripción del proyecto, admite {@code null}
     * @return identificador del proyecto creado
     */
    protected Long createProject(final String name, final String description) {
        return createProject(name, description, null);
    }

    /**
     * Crea un proyecto a través de la API y devuelve su identificador.
     *
     * @param name        nombre del proyecto
     * @param description descripción del proyecto, admite {@code null}
     * @param manager     responsable del proyecto, admite {@code null}
     * @return identificador del proyecto creado
     */
    protected Long createProject(final String name, final String description, final String manager) {
        final ProjectResponse created = restTemplate
                .postForEntity(
                        PROJECTS_PATH, new ProjectRequest(name, description, manager), ProjectResponse.class)
                .getBody();
        assertThat(created).isNotNull();
        return created.id();
    }
}
