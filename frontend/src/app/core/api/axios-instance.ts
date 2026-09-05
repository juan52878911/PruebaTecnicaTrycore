import { inject, InjectionToken } from '@angular/core';
import axios, { type AxiosAdapter, type AxiosInstance } from 'axios';

import { API_CONFIG, ApiConfig } from './api-config';
import { registerErrorInterceptor } from './interceptors/error-interceptor';
import { registerLoggingInterceptor } from './interceptors/logging-interceptor';

/**
 * Construye el cliente HTTP de la aplicación.
 *
 * Es el ÚNICO punto del proyecto donde se importa axios y donde se llama a `axios.create`. Los
 * servicios y los componentes dependen de `AXIOS_INSTANCE` y de `ApiError`, nunca de axios: migrar
 * a otro cliente HTTP significaría reescribir este fichero y los dos interceptores, sin tocar una
 * sola vista ni un solo test de store.
 *
 * Es una función pura, no un servicio, para poder probarla sin `TestBed`.
 *
 * @param config  raíz del API, margen de espera y si se registran las peticiones
 * @param adapter transporte alternativo; los tests inyectan aquí uno falso para ejercitar la
 *                tubería real (interceptores incluidos) sin levantar un servidor
 */
export function createApiClient(config: ApiConfig, adapter?: AxiosAdapter): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers: { Accept: 'application/json, application/problem+json' },
    ...(adapter === undefined ? {} : { adapter }),
  });

  // El orden importa: primero la normalización, para que el registro reciba un ApiError.
  registerErrorInterceptor(instance);
  if (config.enableLogging) {
    registerLoggingInterceptor(instance);
  }
  return instance;
}

/** Instancia única de axios de la aplicación, construida a partir de `API_CONFIG`. */
export const AXIOS_INSTANCE = new InjectionToken<AxiosInstance>('AxiosInstance', {
  providedIn: 'root',
  factory: (): AxiosInstance => createApiClient(inject(API_CONFIG)),
});
