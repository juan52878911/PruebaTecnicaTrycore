import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

import { environment } from '../../../environments/environment';

/** Ajustes del cliente HTTP. Datos puros: ningún fichero de `environments/` importa axios. */
export interface ApiConfig {
  /** Raíz del API, incluida la versión. */
  readonly baseUrl: string;
  /** Corte de una petición que no responde, en milisegundos. */
  readonly timeoutMs: number;
  /** Registra cada petición en consola. Apagado en producción. */
  readonly enableLogging: boolean;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: environment.apiBaseUrl,
  timeoutMs: environment.apiTimeoutMs,
  enableLogging: !environment.production,
};

/**
 * Configuración del cliente HTTP.
 *
 * Es un token y no una constante global exportada a propósito. Un `export const` también sería un
 * singleton, pero congelaría la configuración en el momento del import, se filtraría entre ficheros
 * de test dentro del mismo worker de Vitest y no podría sustituirse ni por inyector ni por
 * subárbol de rutas. Con el token, `TestBed` lo reemplaza en una línea y la dependencia queda
 * declarada en la firma de quien la usa.
 */
export const API_CONFIG = new InjectionToken<ApiConfig>('ApiConfig', {
  providedIn: 'root',
  factory: (): ApiConfig => DEFAULT_API_CONFIG,
});

/** Sobrescribe parte de la configuración en `app.config.ts` o en una ruta concreta. */
export function provideApi(overrides: Partial<ApiConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: API_CONFIG, useValue: { ...DEFAULT_API_CONFIG, ...overrides } },
  ]);
}
