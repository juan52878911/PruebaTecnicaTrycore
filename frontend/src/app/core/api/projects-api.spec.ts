import { TestBed } from '@angular/core/testing';

import { ApiError, isApiError } from './api-error';
import { ProjectsApi } from './projects-api';
import { FAKE_ADAPTER_HANDLE, provideApiTesting } from './testing/fake-adapter';

const BASE = 'http://localhost/api/v1';

const PROJECT = {
  id: 1,
  name: 'Planta Solar Norte',
  description: 'Construcción de la planta fotovoltaica del corredor norte',
  manager: null,
  createdAt: '2026-09-03T21:00:00Z',
  updatedAt: '2026-09-03T21:00:00Z',
};

describe('ProjectsApi', () => {
  function configure(
    routes: Parameters<typeof provideApiTesting>[0] extends undefined
      ? never
      : NonNullable<Parameters<typeof provideApiTesting>[0]>['routes'],
  ) {
    TestBed.configureTestingModule({
      providers: provideApiTesting({ routes, config: { baseUrl: BASE } }),
    });
    return {
      api: TestBed.inject(ProjectsApi),
      handle: TestBed.inject(FAKE_ADAPTER_HANDLE),
    };
  }

  it('pide la lista al endpoint de proyectos', async () => {
    const { api, handle } = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [PROJECT] },
    ]);

    const projects = await api.list();

    expect(projects).toEqual([PROJECT]);
    expect(handle.requests).toEqual([{ method: 'get', url: `${BASE}/projects`, body: undefined }]);
  });

  it('pide el listado consolidado con el parámetro includeIndicators', async () => {
    const summary = {
      ...PROJECT,
      activityCount: 0,
      totals: { budgetAtCompletion: 0, plannedValue: 0, earnedValue: 0, actualCost: 0 },
      indicators: null,
    };
    const { api, handle } = configure([
      { method: 'get', url: `${BASE}/projects`, status: 200, data: [summary] },
    ]);

    const summaries = await api.listWithIndicators();

    expect(summaries).toEqual([summary]);
    expect(handle.requests[0]?.params).toEqual({ includeIndicators: true });
  });

  it('envía el cuerpo declarado al crear un proyecto', async () => {
    const { api, handle } = configure([
      { method: 'post', url: `${BASE}/projects`, status: 201, data: PROJECT },
    ]);

    await api.create({ name: 'Planta Solar Norte', description: 'Descripción', manager: null });

    expect(handle.requests[0]?.method).toBe('post');
    expect(handle.requests[0]?.body).toEqual({
      name: 'Planta Solar Norte',
      description: 'Descripción',
      manager: null,
    });
  });

  it('compone la ruta del recurso al actualizar', async () => {
    const { api, handle } = configure([
      { method: 'put', url: `${BASE}/projects/1`, status: 200, data: PROJECT },
    ]);

    await api.update(1, { name: 'Nuevo nombre', description: null, manager: null });

    expect(handle.requests[0]?.url).toBe(`${BASE}/projects/1`);
  });

  it('resuelve el borrado con un 204 sin cuerpo', async () => {
    const { api } = configure([
      { method: 'delete', url: `${BASE}/projects/1`, status: 204, data: undefined },
    ]);

    await expect(api.remove(1)).resolves.toBeUndefined();
  });

  it('pide el resumen consolidado en su propia ruta', async () => {
    const { api, handle } = configure([
      { method: 'get', url: `${BASE}/projects/1/evm`, status: 200, data: { project: PROJECT } },
    ]);

    await api.evmSummary(1);

    expect(handle.requests[0]?.url).toBe(`${BASE}/projects/1/evm`);
  });

  it('rechaza con un ApiError de validación cuando el backend responde 400', async () => {
    const { api } = configure([
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

    const failure: unknown = await api
      .create({ name: '', description: null, manager: null })
      .catch((e) => e);

    expect(isApiError(failure)).toBe(true);
    const error = failure as ApiError;
    expect(error.kind).toBe('validation');
    expect(error.fieldError('name')).toBe('El nombre del proyecto es obligatorio');
  });

  it('rechaza con not-found cuando el proyecto no existe', async () => {
    const { api } = configure([
      {
        method: 'get',
        url: `${BASE}/projects/9`,
        status: 404,
        data: { status: 404, detail: 'El proyecto 9 no existe' },
      },
    ]);

    const failure = (await api.getById(9).catch((e: unknown) => e)) as ApiError;

    expect(failure.kind).toBe('not-found');
    expect(failure.detail).toBe('El proyecto 9 no existe');
  });
});
