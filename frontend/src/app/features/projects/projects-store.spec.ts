import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FakeRoute, provideApiTesting } from '../../core/api/testing/fake-adapter';
import { ProjectsStore } from './projects-store';

const BASE = 'http://localhost/api/v1';

const PROJECT = {
  id: 1,
  name: 'Planta Solar Norte',
  description: null,
  createdAt: '2026-09-03T21:00:00Z',
  updatedAt: '2026-09-03T21:00:00Z',
};

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

function configure(routes: readonly FakeRoute[]): ProjectsStore {
  TestBed.configureTestingModule({
    providers: provideApiTesting({ routes, config: { baseUrl: BASE } }),
  });
  return TestBed.inject(ProjectsStore);
}

describe('ProjectsStore', () => {
  it('publica la lista que devuelve el servidor', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [PROJECT] },
    ]);

    await settle();

    expect(store.projects()).toEqual([PROJECT]);
    expect(store.error()).toBeNull();
  });

  it('deja de estar cargando cuando la respuesta llega', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [PROJECT] },
    ]);

    await settle();

    expect(store.isLoading()).toBe(false);
  });

  it('reconoce la lista vacía como estado vacío, no como error', async () => {
    const store = configure([{ method: 'get', url: `${BASE}/projects`, status: 200, data: [] }]);

    await settle();

    expect(store.isEmpty()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('expone el fallo de carga por el signal de error', async () => {
    const store = configure([
      {
        method: 'get',
        url: `${BASE}/projects`,
        status: 500,
        data: { status: 500, detail: 'fallo interno' },
      },
    ]);

    await settle();

    expect(store.error()?.kind).toBe('server');
    expect(store.projects()).toEqual([]);
  });

  it('recarga la lista después de crear un proyecto', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [PROJECT] },
      { method: 'post', url: `${BASE}/projects`, status: 201, data: PROJECT },
    ]);
    await settle();

    const created = await store.create({ name: 'Nuevo', description: null });
    await settle();

    expect(created).toEqual(PROJECT);
    expect(store.error()).toBeNull();
  });

  it('no propaga el rechazo de una escritura: lo publica como error', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [] },
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
    await settle();

    const created = await store.create({ name: '', description: null });

    expect(created).toBeNull();
    expect(store.error()?.kind).toBe('validation');
    expect(store.error()?.fieldError('name')).toBe('El nombre del proyecto es obligatorio');
  });

  it('devuelve false cuando el borrado falla', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [PROJECT] },
      {
        method: 'delete',
        url: `${BASE}/projects/1`,
        status: 404,
        data: { status: 404, detail: 'El proyecto 1 no existe' },
      },
    ]);
    await settle();

    expect(await store.remove(1)).toBe(false);
    expect(store.error()?.kind).toBe('not-found');
  });

  it('limpia el error cuando se le pide', async () => {
    const store = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [] },
      { method: 'post', url: `${BASE}/projects`, status: 500, data: {} },
    ]);
    await settle();
    await store.create({ name: 'x', description: null });

    store.clearError();

    expect(store.error()).toBeNull();
  });
});
