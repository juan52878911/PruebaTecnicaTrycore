import { Environment } from './environment.model';

/**
 * Entorno de desarrollo, el que se usa por defecto.
 *
 * La URL es absoluta y apunta al backend local. No hay proxy en `ng serve`: el backend declara
 * este origen en `evm.cors.allowed-origins`, de modo que el camino que se prueba en local es el
 * mismo que en producción, con su preflight y sus cabeceras.
 */
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  apiTimeoutMs: 10_000,
};
