import { EvmIndicators } from './evm';
import { IsoDate, Project } from './project';

/** Actividad con sus indicadores ya calculados por el servidor. */
export interface Activity {
  readonly id: number;
  readonly projectId: number;
  readonly name: string;
  readonly budgetAtCompletion: number;
  /** Escala 0-100. */
  readonly plannedProgressPercent: number;
  /** Escala 0-100. */
  readonly actualProgressPercent: number;
  readonly actualCost: number;
  readonly plannedStartDate: IsoDate | null;
  readonly plannedEndDate: IsoDate | null;
  readonly actualStartDate: IsoDate | null;
  readonly actualEndDate: IsoDate | null;
  readonly indicators: EvmIndicators;
}

/** Cuerpo de `POST` y `PUT` de actividad. Las fechas son opcionales; el resto no. */
export interface ActivityRequest {
  readonly name: string;
  readonly budgetAtCompletion: number;
  readonly plannedProgressPercent: number;
  readonly actualProgressPercent: number;
  readonly actualCost: number;
  readonly plannedStartDate: IsoDate | null;
  readonly plannedEndDate: IsoDate | null;
  readonly actualStartDate: IsoDate | null;
  readonly actualEndDate: IsoDate | null;
}

/** Resumen consolidado del proyecto con el detalle de cada actividad. */
export interface ProjectEvmSummary {
  readonly project: Project;
  readonly budgetAtCompletion: number;
  readonly indicators: EvmIndicators;
  readonly activities: readonly Activity[];
}

/**
 * Límites que valida el backend. El servidor rechaza con 400 más decimales de los admitidos: no
 * redondea. El formulario tiene que impedirlo antes de enviar.
 */
export const ACTIVITY_NAME_MAX_LENGTH = 120;
export const MONEY_DECIMAL_PLACES = 2;
export const PERCENT_DECIMAL_PLACES = 2;
export const PERCENT_MIN = 0;
export const PERCENT_MAX = 100;
