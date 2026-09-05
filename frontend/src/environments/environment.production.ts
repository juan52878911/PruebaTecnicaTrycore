import { Environment } from './environment.model';

/**
 * Entorno de producción.
 *
 * El build se sirve como estático desde su propio origen y llama al backend por CORS. El margen
 * de espera es mayor que en desarrollo porque una base de datos con volumen real tarda más en
 * consolidar los indicadores de un proyecto grande.
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  apiTimeoutMs: 15_000,
};
