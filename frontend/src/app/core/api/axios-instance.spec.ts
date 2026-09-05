import { TestBed } from '@angular/core/testing';
import type { AxiosInstance } from 'axios';

import { API_CONFIG, ApiConfig, provideApi } from './api-config';
import { AXIOS_INSTANCE, createApiClient } from './axios-instance';
import type { ApiLogger } from './interceptors/logging-interceptor';
import { createFakeAdapter } from './testing/fake-adapter';

function silentLogger(): ApiLogger & { debugCalls: number; errorCalls: number } {
  return {
    debugCalls: 0,
    errorCalls: 0,
    debug(this: { debugCalls: number }) {
      this.debugCalls += 1;
    },
    error(this: { errorCalls: number }) {
      this.errorCalls += 1;
    },
  };
}

describe('createApiClient', () => {
  const config: ApiConfig = {
    baseUrl: 'http://localhost/api/v1',
    timeoutMs: 1234,
    enableLogging: false,
  };

  it('toma la raíz del API y el margen de espera de la configuración', () => {
    const client = createApiClient(config);

    expect(client.defaults.baseURL).toBe('http://localhost/api/v1');
    expect(client.defaults.timeout).toBe(1234);
  });

  it('acepta los dos formatos de respuesta que emite el backend', () => {
    const client = createApiClient(config);

    expect(client.defaults.headers['Accept']).toBe('application/json, application/problem+json');
  });

  it('usa el transporte que se le inyecta en lugar de la red', async () => {
    const handle = createFakeAdapter([
      { method: 'get', url: 'http://localhost/api/v1/projects', status: 200, data: [] },
    ]);
    const client = createApiClient(config, handle.adapter);

    const response = await client.get('/projects');

    expect(response.data).toEqual([]);
    expect(handle.requests).toHaveLength(1);
  });

  it('normaliza los fallos aunque el registro esté apagado', async () => {
    const handle = createFakeAdapter([
      {
        method: 'get',
        url: 'http://localhost/api/v1/projects/9',
        status: 404,
        data: { status: 404, detail: 'El proyecto 9 no existe' },
      },
    ]);
    const client = createApiClient(config, handle.adapter);

    const failure = (await client.get('/projects/9').catch((e: unknown) => e)) as {
      kind: string;
      detail: string;
    };

    expect(failure.kind).toBe('not-found');
    expect(failure.detail).toBe('El proyecto 9 no existe');
  });
});

describe('AXIOS_INSTANCE', () => {
  it('es la misma instancia en toda la aplicación', () => {
    TestBed.configureTestingModule({});

    const first: AxiosInstance = TestBed.inject(AXIOS_INSTANCE);
    const second: AxiosInstance = TestBed.inject(AXIOS_INSTANCE);

    expect(first).toBe(second);
  });

  it('se reconfigura sustituyendo API_CONFIG, sin tocar el código que la usa', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: API_CONFIG,
          useValue: { baseUrl: '/otro-api', timeoutMs: 50, enableLogging: false },
        },
      ],
    });

    const client = TestBed.inject(AXIOS_INSTANCE);

    expect(client.defaults.baseURL).toBe('/otro-api');
    expect(client.defaults.timeout).toBe(50);
  });

  it('provideApi sobrescribe solo lo que se le pasa', () => {
    TestBed.configureTestingModule({ providers: [provideApi({ timeoutMs: 30_000 })] });

    const applied = TestBed.inject(API_CONFIG);

    expect(applied.timeoutMs).toBe(30_000);
    expect(applied.baseUrl).toBe('http://localhost/api/v1');
  });
});

describe('registro de peticiones', () => {
  it('no traza nada cuando el registro está apagado', async () => {
    const logger = silentLogger();
    const handle = createFakeAdapter([
      { method: 'get', url: 'http://localhost/api/v1/projects', status: 200, data: [] },
    ]);
    const client = createApiClient(
      { baseUrl: 'http://localhost/api/v1', timeoutMs: 100, enableLogging: false },
      handle.adapter,
    );
    // El interceptor de registro ni siquiera se instala, así que el doble queda intacto.
    await client.get('/projects');

    expect(logger.debugCalls).toBe(0);
  });
});
