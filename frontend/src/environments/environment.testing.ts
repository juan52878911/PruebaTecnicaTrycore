import { Environment } from './environment.model';

/**
 * Entorno de pruebas.
 *
 * Se llama `environment.testing.ts` y no `environment.test.ts` porque Vitest recoge como fichero
 * de pruebas todo lo que encaje con `*.test.ts`, y este no contiene ninguna.
 *
 * No es el mecanismo principal de configuración en los tests: para eso están los proveedores de
 * `TestBed`, que actúan por prueba. Este fichero solo fija el valor por defecto de los specs que
 * no configuran nada.
 *
 * La URL es absoluta para que las aserciones sobre `baseURL` no dependan de la URL base de jsdom,
 * y el margen de espera es diminuto a propósito: convierte "este test olvidó simular la respuesta"
 * en un fallo rápido y legible en lugar de una espera de diez segundos.
 */
export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost/api/v1',
  apiTimeoutMs: 100,
};
