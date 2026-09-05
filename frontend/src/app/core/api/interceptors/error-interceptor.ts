import type { AxiosInstance } from 'axios';

import { toApiError } from '../api-error';

/**
 * Convierte todo fallo de axios en un `ApiError` antes de que salga del cliente.
 *
 * Solo intercepta el brazo de rechazo; la lógica vive en `toApiError`, que es pura y se prueba
 * por separado. Se registra antes que el de registro para que este reciba el error ya
 * normalizado y no tenga que conocer la forma de `AxiosError`.
 */
export function registerErrorInterceptor(instance: AxiosInstance): number {
  return instance.interceptors.response.use(undefined, (error: unknown) =>
    Promise.reject(toApiError(error)),
  );
}
