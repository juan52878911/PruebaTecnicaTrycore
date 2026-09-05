import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FAKE_ADAPTER_HANDLE,
  FakeAdapterHandle,
  FakeRoute,
  provideApiTesting,
} from '../../core/api/testing/fake-adapter';
import { ProjectsStore } from './projects-store';

const BASE = 'http://localhost/api/v1';

const PROJECT = {
  id: 1,
  name: 'Planta Solar Norte',
  description: null,
  manager: null,
  createdAt: '2026-09-03T21:00:00Z',
  updatedAt: '2026-09-03T21:00:00Z',
};

const REQUEST = { name: 'Nuevo', description: null, manager: null };

/**
 * `resource()` arranca su carga desde un efecto, así que no basta con esperar una microtarea: sin
 * el `tick()` el recurso sigue en reposo y el test falla de una forma difícil de leer. El patrón
 * correcto en una aplicación sin zone.js es propagar los efectos y después esperar a que la
 * aplicación quede estable.
 */
async function settle(): Promise<void> {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

function configure(routes: readonly FakeRoute[]): {
  store: ProjectsStore;
  handle: FakeAdapterHandle;
} {
  TestBed.configureTestingModule({
    providers: provideApiTesting({ routes, config: { baseUrl: BASE } }),
  });
  return { store: TestBed.inject(ProjectsStore), handle: TestBed.inject(FAKE_ADAPTER_HANDLE) };
}

describe('ProjectsStore', () => {
  it('devuelve el proyecto creado y recarga el consolidado', async () => {
    const { store, handle } = configure([
      { method: 'post', url: `${BASE}/projects`, status: 201, data: PROJECT },
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [] },
    ]);

    const created = await store.create(REQUEST);
    await settle();

    expect(created).toEqual(PROJECT);
    expect(store.error()).toBeNull();
    const reload = handle.requests.find((request) => request.method === 'get');
    expect(reload?.params).toEqual({ includeIndicators: true });
  });

  it('deja de estar escribiendo cuando la respuesta llega', async () => {
    const { store } = configure([
      { method: 'put', url: `${BASE}/projects/1`, status: 200, data: PROJECT },
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [] },
    ]);

    const pending = store.update(1, REQUEST);
    expect(store.isMutating()).toBe(true);
    await pending;

    expect(store.isMutating()).toBe(false);
  });

  it('no propaga el rechazo de una escritura: lo publica como error', async () => {
    const { store } = configure([
      {
        method: 'post',
        url: `${BASE}/projects`,
        status: 400,
        data: {
          status: 400,
          detail: 'La petición contiene campos inválidos',
          errors: [{ field: 'name', message: 'El nombre del proyecto es obligatorio' }],
        },
      },
    ]);

    const created = await store.create({ ...REQUEST, name: '' });

    expect(created).toBeNull();
    expect(store.error()?.kind).toBe('validation');
    expect(store.error()?.fieldError('name')).toBe('El nombre del proyecto es obligatorio');
  });

  it('devuelve false cuando el borrado falla', async () => {
    const { store } = configure([
      {
        method: 'delete',
        url: `${BASE}/projects/1`,
        status: 404,
        data: { status: 404, detail: 'El proyecto 1 no existe' },
      },
    ]);

    expect(await store.remove(1)).toBe(false);
    expect(store.error()?.kind).toBe('not-found');
  });

  it('limpia el error cuando se le pide', async () => {
    const { store } = configure([
      { method: 'post', url: `${BASE}/projects`, status: 500, data: {} },
    ]);
    await store.create(REQUEST);

    store.clearError();

    expect(store.error()).toBeNull();
  });
});
