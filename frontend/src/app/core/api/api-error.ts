import { isProblemDetail, ProblemDetail } from './problem-detail';

/** Familia del error, para que la interfaz decida qué mostrar sin inspeccionar códigos HTTP. */
export type ApiErrorKind =
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'client'
  | 'server'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'unknown';

export interface ApiErrorRequestInfo {
  readonly method: string;
  readonly url: string;
}

interface ApiErrorInit {
  readonly kind: ApiErrorKind;
  readonly detail: string;
  readonly status?: number | null;
  readonly title?: string | null;
  readonly instance?: string | null;
  readonly fieldErrors?: Readonly<Record<string, string>>;
  readonly request?: ApiErrorRequestInfo | null;
  readonly cause?: unknown;
}

/**
 * Error de dominio del frontend: lo único que ven los servicios y los componentes.
 *
 * Extiende `Error` a propósito. `resource()` de Angular envuelve en `Error` cualquier rechazo que
 * no lo sea, y esa envoltura perdería `kind`, `status` y `fieldErrors`.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly title: string | null;
  /** Mensaje apto para mostrar al usuario. Siempre presente. */
  readonly detail: string;
  readonly instance: string | null;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly request: ApiErrorRequestInfo | null;

  constructor(init: ApiErrorInit) {
    super(init.detail, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.detail = init.detail;
    this.status = init.status ?? null;
    this.title = init.title ?? null;
    this.instance = init.instance ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.request = init.request ?? null;
  }

  /**
   * Motivo de rechazo de un campo, o `undefined` si ese campo pasó la validación.
   *
   * Existe como método porque `noPropertyAccessFromIndexSignature` prohíbe leer
   * `fieldErrors.name` y obligaría a cada llamante a escribir el acceso por índice.
   */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field];
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

const MESSAGES = {
  canceled: 'Petición cancelada',
  timeout: 'El servidor tardó demasiado en responder',
  network: 'No se pudo contactar con el servidor. Comprueba que el backend esté en marcha.',
  validation: 'La petición contiene campos inválidos',
  conflict: 'El recurso ya existe o está en un estado que impide la operación',
  notFound: 'El recurso solicitado no existe',
  server: 'El servidor encontró un error inesperado',
  unknown: 'Ocurrió un error inesperado',
} as const;

const STATUS_BAD_REQUEST = 400;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;
const STATUS_CLIENT_ERROR_START = 400;
const STATUS_SERVER_ERROR_START = 500;

const CODE_CANCELED = 'ERR_CANCELED';
const CODE_ABORTED = 'ECONNABORTED';
const CODE_TIMED_OUT = 'ETIMEDOUT';

/** Vista mínima de un error de axios, para no acoplar este módulo a sus tipos. */
interface AxiosLikeError {
  readonly code?: string;
  readonly message?: string;
  readonly config?: { readonly method?: string; readonly url?: string; readonly baseURL?: string };
  readonly response?: { readonly status: number; readonly data?: unknown };
}

function asAxiosLikeError(error: unknown): AxiosLikeError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  return error as AxiosLikeError;
}

function requestInfoOf(error: AxiosLikeError): ApiErrorRequestInfo | null {
  const config = error.config;
  if (config === undefined) {
    return null;
  }
  const path = config.url ?? '';
  const base = config.baseURL ?? '';
  const url = path.startsWith(base) ? path : `${base}${path}`;
  return { method: (config.method ?? 'get').toUpperCase(), url };
}

function fieldErrorsOf(problem: ProblemDetail): Record<string, string> {
  const collected: Record<string, string> = {};
  for (const entry of problem.errors ?? []) {
    collected[entry.field] = entry.message;
  }
  return collected;
}

/**
 * Traduce cualquier fallo de axios al error de dominio del frontend.
 *
 * Es una función pura para poder probarla sin red ni inyector. El orden de las comprobaciones
 * importa: una petición cancelada tampoco trae respuesta, así que se clasifica antes que el
 * error de red.
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  const axiosError = asAxiosLikeError(error);
  if (axiosError === null) {
    return new ApiError({ kind: 'unknown', detail: MESSAGES.unknown, cause: error });
  }

  const request = requestInfoOf(axiosError);
  const base = { request, cause: error } as const;

  if (axiosError.code === CODE_CANCELED) {
    return new ApiError({ ...base, kind: 'canceled', detail: MESSAGES.canceled });
  }
  if (axiosError.code === CODE_ABORTED || axiosError.code === CODE_TIMED_OUT) {
    return new ApiError({ ...base, kind: 'timeout', detail: MESSAGES.timeout });
  }

  const response = axiosError.response;
  if (response === undefined) {
    return new ApiError({ ...base, kind: 'network', detail: MESSAGES.network });
  }

  const status = response.status;
  const problem: ProblemDetail = isProblemDetail(response.data) ? response.data : {};
  const title = problem.title ?? null;
  const instance = problem.instance ?? null;

  if (status === STATUS_BAD_REQUEST) {
    const fieldErrors = fieldErrorsOf(problem);
    return new ApiError({
      ...base,
      kind: 'validation',
      status,
      title,
      instance,
      fieldErrors,
      detail: problem.detail ?? MESSAGES.validation,
    });
  }
  if (status === STATUS_NOT_FOUND) {
    return new ApiError({
      ...base,
      kind: 'not-found',
      status,
      title,
      instance,
      detail: problem.detail ?? MESSAGES.notFound,
    });
  }
  if (status === STATUS_CONFLICT) {
    return new ApiError({
      ...base,
      kind: 'conflict',
      status,
      title,
      instance,
      detail: problem.detail ?? MESSAGES.conflict,
    });
  }
  if (status >= STATUS_SERVER_ERROR_START) {
    // El cuerpo de un 5xx puede traer detalles internos; nunca se muestra al usuario.
    return new ApiError({ ...base, kind: 'server', status, title, detail: MESSAGES.server });
  }
  if (status >= STATUS_CLIENT_ERROR_START) {
    return new ApiError({
      ...base,
      kind: 'client',
      status,
      title,
      instance,
      detail: problem.detail ?? problem.title ?? MESSAGES.unknown,
    });
  }

  return new ApiError({ ...base, kind: 'unknown', status, detail: MESSAGES.unknown });
}

/**
 * Filtra las cancelaciones antes de enseñar un error.
 *
 * Cuando `resource()` aborta una carga porque cambió el proyecto seleccionado, el rechazo es
 * esperado. Pintarlo haría parpadear el tablero con un error falso en cada cambio.
 */
export function asDisplayableError(error: Error | undefined): ApiError | null {
  if (error === undefined) {
    return null;
  }
  const apiError = isApiError(error) ? error : toApiError(error);
  return apiError.kind === 'canceled' ? null : apiError;
}
