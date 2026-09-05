/** Un campo que no superó la validación, con su motivo. */
export interface ProblemFieldError {
  readonly field: string;
  readonly message: string;
}

/** Cuerpo de error RFC 7807 tal y como lo emite el manejador global del backend. */
export interface ProblemDetail {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly ProblemFieldError[];
}

function isFieldError(value: unknown): value is ProblemFieldError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate['field'] === 'string' && typeof candidate['message'] === 'string';
}

/**
 * Comprueba que el cuerpo del error tenga forma de RFC 7807 antes de leerlo.
 *
 * No es paranoia: un 500 que no pase por el manejador global, o un error del propio servidor de
 * estáticos, devuelve HTML o texto plano. Sin esta comprobación, `detail` sería `undefined` y el
 * usuario acabaría viendo "undefined" en pantalla.
 */
export function isProblemDetail(value: unknown): value is ProblemDetail {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const hasTextualField =
    typeof candidate['detail'] === 'string' ||
    typeof candidate['title'] === 'string' ||
    typeof candidate['status'] === 'number';
  if (!hasTextualField) {
    return false;
  }
  const errors = candidate['errors'];
  return errors === undefined || (Array.isArray(errors) && errors.every(isFieldError));
}
