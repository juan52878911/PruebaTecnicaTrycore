/**
 * Forma de la configuración por entorno.
 *
 * Tiparla no es cosmético: `fileReplacements` de Angular sustituye un fichero por otro sin
 * comprobar que tengan la misma forma. Sin esta interfaz compartida, un campo que faltara en
 * `environment.production.ts` solo se descubriría en tiempo de ejecución, ya en producción.
 */
export interface Environment {
  /** Activa las optimizaciones y apaga el registro de peticiones. */
  readonly production: boolean;
  /** Raíz del API, incluida la versión. Ejemplo: `http://localhost:8080/api/v1`. */
  readonly apiBaseUrl: string;
  /** Corte de una petición que no responde, en milisegundos. */
  readonly apiTimeoutMs: number;
}
