import { ApiError, asDisplayableError, isApiError, toApiError } from './api-error';

/**
 * `toApiError` es una función pura, así que se prueba sin TestBed y sin red. Es la pieza con más
 * lógica de la capa de acceso a datos y la más barata de cubrir.
 */
describe('toApiError', () => {
  const config = { method: 'post', url: '/projects/1/activities', baseURL: '/api/v1' };

  function axiosFailure(status: number, data: unknown): unknown {
    return { config, response: { status, data } };
  }

  it('convierte un 400 con errores por campo en un fallo de validación', () => {
    const error = toApiError(
      axiosFailure(400, {
        status: 400,
        detail: 'La petición contiene campos inválidos',
        instance: '/api/v1/projects/1/activities',
        errors: [
          { field: 'plannedProgressPercent', message: 'debe estar entre 0 y 100' },
          { field: 'name', message: 'El nombre de la actividad es obligatorio' },
        ],
      }),
    );

    expect(error.kind).toBe('validation');
    expect(error.status).toBe(400);
    expect(error.detail).toBe('La petición contiene campos inválidos');
    expect(error.fieldError('plannedProgressPercent')).toBe('debe estar entre 0 y 100');
    expect(error.fieldError('name')).toBe('El nombre de la actividad es obligatorio');
    expect(error.fieldError('actualCost')).toBeUndefined();
    expect(error.hasFieldErrors).toBe(true);
    expect(error.request).toEqual({ method: 'POST', url: '/api/v1/projects/1/activities' });
  });

  it('convierte un 400 sin lista de errores en validación sin campos', () => {
    const error = toApiError(axiosFailure(400, { status: 400, detail: 'JSON malformado' }));

    expect(error.kind).toBe('validation');
    expect(error.detail).toBe('JSON malformado');
    expect(error.hasFieldErrors).toBe(false);
  });

  it('reconoce el 404 y conserva el motivo del backend', () => {
    const error = toApiError(axiosFailure(404, { status: 404, detail: 'El proyecto 9 no existe' }));

    expect(error.kind).toBe('not-found');
    expect(error.detail).toBe('El proyecto 9 no existe');
  });

  it('reconoce el 409 de corte duplicado como conflicto', () => {
    const error = toApiError(
      axiosFailure(409, { status: 409, detail: 'Ya existe un corte en esa fecha' }),
    );

    expect(error.kind).toBe('conflict');
    expect(error.detail).toBe('Ya existe un corte en esa fecha');
  });

  it('no filtra el cuerpo de un 5xx al usuario', () => {
    const error = toApiError(
      axiosFailure(500, '<html><body>NullPointerException en línea 42</body></html>'),
    );

    expect(error.kind).toBe('server');
    expect(error.detail).toBe('El servidor encontró un error inesperado');
    expect(error.detail).not.toContain('NullPointerException');
  });

  it('trata la ausencia de respuesta como fallo de red', () => {
    const error = toApiError({ config, message: 'Network Error' });

    expect(error.kind).toBe('network');
    expect(error.status).toBeNull();
  });

  it('distingue el corte por tiempo de un fallo de red', () => {
    expect(toApiError({ config, code: 'ECONNABORTED' }).kind).toBe('timeout');
    expect(toApiError({ config, code: 'ETIMEDOUT' }).kind).toBe('timeout');
  });

  it('clasifica la cancelación antes que el fallo de red, aunque tampoco traiga respuesta', () => {
    const error = toApiError({ config, code: 'ERR_CANCELED' });

    expect(error.kind).toBe('canceled');
  });

  it('devuelve el mismo ApiError si ya venía normalizado', () => {
    const original = new ApiError({ kind: 'server', detail: 'ya normalizado' });

    expect(toApiError(original)).toBe(original);
  });

  it('no se rompe con un valor que no tiene forma de error', () => {
    const error = toApiError('esto no es un error');

    expect(error.kind).toBe('unknown');
    expect(isApiError(error)).toBe(true);
  });
});

describe('asDisplayableError', () => {
  it('descarta las cancelaciones para que el tablero no parpadee al cambiar de proyecto', () => {
    const canceled = new ApiError({ kind: 'canceled', detail: 'Petición cancelada' });

    expect(asDisplayableError(canceled)).toBeNull();
  });

  it('deja pasar el resto de errores', () => {
    const failure = new ApiError({ kind: 'network', detail: 'Sin servidor' });

    expect(asDisplayableError(failure)).toBe(failure);
  });

  it('devuelve null cuando no hay error', () => {
    expect(asDisplayableError(undefined)).toBeNull();
  });
});
