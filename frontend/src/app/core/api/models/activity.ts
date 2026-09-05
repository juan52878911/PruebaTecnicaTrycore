import { EvmIndicators } from './evm';

/**
 * Regla con la que una actividad reconoce valor.
 *
 * Se aplica tanto al valor planificado como al ganado: restar dos cifras medidas con varas
 * distintas fabricaría atrasos que no existen.
 */
export type MeasurementMethod =
  'PERCENT_COMPLETE' | 'FIXED_0_100' | 'FIXED_50_50' | 'WEIGHTED_MILESTONES';
import { IsoDate, Project } from './project';

/** Hito de una actividad medida por hitos ponderados. El orden es su posición en la lista. */
export interface Milestone {
  readonly name: string;
  /** Peso sobre el avance de la actividad; los de todos los hitos suman 100. */
  readonly weightPercent: number;
  readonly achieved: boolean;
  readonly achievedOn: IsoDate | null;
}

/** Hito tal como viaja en la petición. `achieved` y `achievedOn` son opcionales. */
export interface MilestoneRequest {
  readonly name: string;
  readonly weightPercent: number;
  readonly achieved?: boolean;
  readonly achievedOn?: IsoDate | null;
}

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
  readonly measurementMethod: MeasurementMethod;
  /** Nombre legible de la regla, redactado por el servidor. */
  readonly measurementMethodDescription: string;
  /**
   * Porcentajes que la regla reconoció, que con las reglas de umbral no coinciden con los
   * declarados. Sin este dato, un valor ganado de cero sobre un avance del 65 % parecería un error
   * en lugar de la regla haciendo su trabajo.
   */
  readonly effectivePlannedProgressPercent: number;
  readonly effectiveActualProgressPercent: number;
  /** Avance derivado de los hitos; solo existe con `WEIGHTED_MILESTONES`. */
  readonly derivedProgressPercent: number | null;
  /** Siempre viaja, aunque la regla vigente no sea la de hitos: cambiar de regla no los borra. */
  readonly milestones: readonly Milestone[];
  readonly indicators: EvmIndicators;
}

/**
 * Cuerpo de `POST` y `PUT` de actividad. Las fechas son opcionales; el resto no.
 *
 * Con `WEIGHTED_MILESTONES` el avance real deja de ser un dato de entrada: se envía `null` y el
 * servidor lo deriva de los hitos. Enviarlo con esa regla es un 400 que nombra el campo.
 */
export interface ActivityRequest {
  readonly name: string;
  readonly budgetAtCompletion: number;
  readonly plannedProgressPercent: number;
  readonly actualProgressPercent: number | null;
  readonly actualCost: number;
  readonly plannedStartDate: IsoDate | null;
  readonly plannedEndDate: IsoDate | null;
  readonly actualStartDate: IsoDate | null;
  readonly actualEndDate: IsoDate | null;
  /** Opcional: si se omite, el servidor usa el porcentaje completado. */
  readonly measurementMethod: MeasurementMethod | null;
  /**
   * Reemplaza entera la tabla de hitos. Omitirla en una modificación conserva la actual, que es lo
   * que hace este cliente mientras no edita hitos.
   */
  readonly milestones?: readonly MilestoneRequest[];
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
