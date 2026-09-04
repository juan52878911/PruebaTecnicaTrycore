package com.trycore.evm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

/** Metadatos generales de la documentación OpenAPI, expuesta en {@code /api-docs} y {@code /swagger-ui}. */
@Configuration
public class OpenApiConfig {

    private static final String API_TITLE = "API de Valor Ganado (EVM)";
    private static final String API_DESCRIPTION =
            "Backend para el cálculo de indicadores de Valor Ganado (EVM) de proyectos y sus actividades.";
    private static final String API_VERSION = "v1";

    @Bean
    public OpenAPI evmOpenApi() {
        return new OpenAPI().info(new Info()
                .title(API_TITLE)
                .description(API_DESCRIPTION)
                .version(API_VERSION));
    }
}
