import { InjectionToken, Provider } from '@angular/core';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { API_CONFIG, ApiConfig, DEFAULT_API_CONFIG } from '../api-config';
import { AXIOS_INSTANCE, createApiClient } from '../axios-instance';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete';

export interface FakeRoute {
  readonly method: HttpMethod;
  /** Se compara contra la ruta completa (baseURL + url). Usa RegExp para los identificadores. */
  readonly url: string | RegExp;
  readonly status: number;
  readonly data?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  /** Latencia simulada; sirve para probar el corte por tiempo y las carreras de cancelación. */
  readonly delayMs?: number;
}

export interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
}

export interface FakeAdapterHandle {
  readonly adapter: AxiosAdapter;
  /** Peticiones observadas, para afirmar método, ruta y cuerpo enviado. */
  readonly requests: readonly RecordedRequest[];
}

const STATUS_OK_START = 200;
const STATUS_OK_END = 300;
const STATUS_NOT_IMPLEMENTED = 501;

/**
 * Une `baseURL` y `url` con la tolerancia necesaria.
 *
 * Según la versión de axios, el adaptador recibe la ruta relativa con `baseURL` aparte o ya
 * combinada. Sin esta normalización, subir de versión produciría fallos de emparejamiento sin
 * explicación aparente.
 */
function fullUrl(config: InternalAxiosRequestConfig): string {
  const path = config.url ?? '';
  const base = config.baseURL ?? '';
  return base === '' || path.startsWith(base) ? path : `${base}${path}`;
}

function matches(route: FakeRoute, method: string, url: string): boolean {
  if (route.method !== method) {
    return false;
  }
  return typeof route.url === 'string' ? route.url === url : route.url.test(url);
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function wait(delayMs: number | undefined, signal: AbortSignal | undefined): Promise<void> {
  if (delayMs === undefined || delayMs <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }));
    });
  });
}

/**
 * Transporte falso para axios.
 *
 * Sustituir el adaptador, y no el módulo entero con `vi.mock('axios')`, hace que los tests
 * ejerciten la tubería real: interceptores, transformaciones, corte por tiempo, propagación del
 * `AbortSignal` y la normalización RFC 7807. Y no añade ninguna dependencia.
 */
export function createFakeAdapter(routes: readonly FakeRoute[]): FakeAdapterHandle {
  const requests: RecordedRequest[] = [];

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase();
    const url = fullUrl(config);
    requests.push({ method, url, body: parseBody(config.data) });

    const route = routes.find((candidate) => matches(candidate, method, url));
    if (route === undefined) {
      // Un 501 con mensaje explícito es mucho más legible que un emparejamiento silencioso.
      throw Object.assign(new Error(`Ruta no simulada: ${method.toUpperCase()} ${url}`), {
        config,
        response: {
          status: STATUS_NOT_IMPLEMENTED,
          data: { status: STATUS_NOT_IMPLEMENTED, detail: `Ruta no simulada: ${url}` },
          headers: {},
          config,
          statusText: 'Not Implemented',
        },
      });
    }

    await wait(route.delayMs, config.signal as AbortSignal | undefined);

    const response: AxiosResponse = {
      data: route.data,
      status: route.status,
      statusText: '',
      headers: route.headers ?? {},
      config,
    };
    if (route.status >= STATUS_OK_START && route.status < STATUS_OK_END) {
      return response;
    }
    throw Object.assign(new Error(`Request failed with status code ${route.status}`), {
      config,
      response,
    });
  };

  return { adapter, requests };
}

/** Permite que un spec lea las peticiones observadas: `TestBed.inject(FAKE_ADAPTER_HANDLE)`. */
export const FAKE_ADAPTER_HANDLE = new InjectionToken<FakeAdapterHandle>('FakeAdapterHandle');

/** Proveedores de `TestBed`: instancia real e interceptores reales sobre un transporte falso. */
export function provideApiTesting(options?: {
  readonly routes?: readonly FakeRoute[];
  readonly config?: Partial<ApiConfig>;
}): Provider[] {
  const config: ApiConfig = { ...DEFAULT_API_CONFIG, enableLogging: false, ...options?.config };
  const handle = createFakeAdapter(options?.routes ?? []);
  return [
    { provide: API_CONFIG, useValue: config },
    { provide: AXIOS_INSTANCE, useValue: createApiClient(config, handle.adapter) },
    { provide: FAKE_ADAPTER_HANDLE, useValue: handle },
  ];
}
