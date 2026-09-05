/** Instante de Java serializado en ISO-8601 UTC. Ejemplo: `2026-09-03T21:00:00Z`. */
export type IsoInstant = string;

/** Fecha de Java sin hora, en ISO-8601. Ejemplo: `2026-08-31`. */
export type IsoDate = string;

import { EvmIndicators, EvmTotals } from './evm';

/** Proyecto tal y como lo devuelve `GET /projects`. */
export interface Project {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  /** Responsable; nulo mientras no haya ninguno asignado. */
  readonly manager: string | null;
  readonly createdAt: IsoInstant;
  readonly updatedAt: IsoInstant;
}

/**
 * Proyecto con su consolidado, de `GET /projects?includeIndicators=true`.
 *
 * Las cifras salen del mismo cálculo que `GET /projects/{id}/evm`, así que la fila del listado y
 * el detalle no pueden discrepar. Un proyecto sin actividades trae conteo 0, sumas en 0 e índices
 * nulos con estado `NOT_APPLICABLE`, nunca un error.
 */
export interface ProjectSummary extends Project {
  readonly activityCount: number;
  readonly totals: EvmTotals;
  readonly indicators: EvmIndicators;
}

/** Cuerpo de `POST /projects` y `PUT /projects/{id}`. */
export interface ProjectRequest {
  /** Obligatorio, de 1 a 120 caracteres. */
  readonly name: string;
  /** Opcional, hasta 500 caracteres. */
  readonly description: string | null;
  /** Opcional, hasta 120 caracteres. */
  readonly manager: string | null;
}

/** Límites que el backend valida y que el formulario debe respetar antes de enviar. */
export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
export const PROJECT_MANAGER_MAX_LENGTH = 120;
