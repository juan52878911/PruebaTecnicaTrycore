import { EvmIndicators, EvmTotals } from './evm';
import { IsoDate, IsoInstant, Project } from './project';

/** Cifras de una actividad congeladas en la fecha de un corte. */
export interface ActivityMeasurement {
  /** Puede apuntar a una actividad ya eliminada: el histórico sobrevive al borrado. */
  readonly activityId: number | null;
  /** Nombre que tenía la actividad en el corte, aunque después se haya renombrado. */
  readonly activityName: string;
  readonly totals: EvmTotals;
}

/** Corte del histórico: la fotografía del proyecto en una fecha. */
export interface Measurement {
  readonly id: number;
  readonly projectId: number;
  readonly cutoffDate: IsoDate;
  readonly notes: string | null;
  readonly totals: EvmTotals;
  readonly activities: readonly ActivityMeasurement[];
  readonly createdAt: IsoInstant;
}

/**
 * Cuerpo de `POST /projects/{id}/measurements`.
 *
 * No lleva cifras a propósito: el servidor las toma de las actividades tal como están en ese
 * momento. Dos cortes del mismo proyecto en la misma fecha son un conflicto (409).
 */
export interface MeasurementRequest {
  /** Obligatoria y no futura. */
  readonly cutoffDate: IsoDate;
  /** Opcional, hasta 500 caracteres. */
  readonly notes: string | null;
}

/** Punto de la serie temporal, con sus indicadores ya derivados por el servidor. */
export interface MeasurementPoint {
  readonly cutoffDate: IsoDate;
  readonly notes: string | null;
  readonly totals: EvmTotals;
  readonly indicators: EvmIndicators;
}

/** Serie lista para graficar, en orden cronológico ascendente. */
export interface ProjectTimeline {
  readonly project: Project;
  readonly points: readonly MeasurementPoint[];
}

export const MEASUREMENT_NOTES_MAX_LENGTH = 500;
