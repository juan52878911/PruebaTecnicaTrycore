package com.trycore.evm.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Política CORS del API, configurada por perfil mediante {@code evm.cors.allowed-origins}.
 *
 * <p>El frontend Angular se sirve desde un origen distinto al del backend, así que necesita permiso
 * explícito del navegador. La lista de orígenes no se codifica aquí: en dev vale el servidor de
 * desarrollo, en prod llega por variable de entorno y por defecto está vacía, de modo que un
 * despliegue que no la configure no abre el API a nadie.
 *
 * <p>No se permiten credenciales porque el API no tiene autenticación: no hay cookie ni cabecera de
 * sesión que proteger, y habilitarlas obligaría además a renunciar al comodín en las cabeceras.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    /** Rutas cubiertas: solo el API, no la documentación ni los recursos estáticos. */
    private static final String API_PATH_PATTERN = "/api/**";

    private static final String[] ALLOWED_METHODS = {"GET", "POST", "PUT", "DELETE", "OPTIONS"};

    private static final String ALL_HEADERS = "*";

    /** Duración del cacheo de la respuesta de preflight por parte del navegador, en segundos. */
    private static final long PREFLIGHT_MAX_AGE_SECONDS = 3600L;

    private final List<String> allowedOrigins;

    public CorsConfig(@Value("${evm.cors.allowed-origins:}") final List<String> allowedOrigins) {
        // Con la propiedad vacía Spring entrega una lista con una cadena en blanco, no una lista
        // vacía. Sin este filtrado se registraría un origen "" y el mapeo quedaría inservible.
        this.allowedOrigins = allowedOrigins.stream()
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    @Override
    public void addCorsMappings(final CorsRegistry registry) {
        if (allowedOrigins.isEmpty()) {
            return;
        }
        registry.addMapping(API_PATH_PATTERN)
                .allowedOrigins(allowedOrigins.toArray(String[]::new))
                .allowedMethods(ALLOWED_METHODS)
                .allowedHeaders(ALL_HEADERS)
                .allowCredentials(false)
                .maxAge(PREFLIGHT_MAX_AGE_SECONDS);
    }
}
