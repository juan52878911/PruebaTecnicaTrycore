import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { isApiError } from '../api-error';

/** Destino de las trazas. Inyectable para que los tests afirmen sin ensuciar la salida. */
export interface ApiLogger {
  debug(message: string, ...details: readonly unknown[]): void;
  error(message: string, ...details: readonly unknown[]): void;
}

interface TimedRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { startedAt: number };
}

function describe(config: InternalAxiosRequestConfig | undefined): string {
  const method = (config?.method ?? 'get').toUpperCase();
  return `${method} ${config?.url ?? ''}`;
}

function elapsedMs(config: TimedRequestConfig | undefined): number {
  const startedAt = config?.metadata?.startedAt;
  return startedAt === undefined ? 0 : Math.round(performance.now() - startedAt);
}

/**
 * Registra método, ruta, código y duración de cada petición.
 *
 * `createApiClient` solo lo instala cuando la configuración lo pide, de modo que en el build de
 * producción la rama se colapsa y el módulo no entra en el paquete.
 */
export function registerLoggingInterceptor(
  instance: AxiosInstance,
  logger: ApiLogger = console,
): void {
  instance.interceptors.request.use((config: TimedRequestConfig) => {
    config.metadata = { startedAt: performance.now() };
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const config = response.config as TimedRequestConfig;
      logger.debug(`[api] ${describe(config)} -> ${response.status} (${elapsedMs(config)} ms)`);
      return response;
    },
    (error: unknown) => {
      if (isApiError(error)) {
        const status = error.status ?? error.kind;
        logger.error(
          `[api] ${error.request?.method ?? ''} ${error.request?.url ?? ''} -> ${status}`,
          error.detail,
        );
      } else {
        logger.error('[api] fallo no normalizado', error);
      }
      return Promise.reject(error);
    },
  );
}
