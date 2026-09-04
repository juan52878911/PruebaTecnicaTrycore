package com.trycore.evm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto de entrada de la aplicación de backend del sistema de Valor Ganado (EVM).
 */
@SpringBootApplication
public class EvmBackendApplication {

    public static void main(final String[] args) {
        SpringApplication.run(EvmBackendApplication.class, args);
    }
}
