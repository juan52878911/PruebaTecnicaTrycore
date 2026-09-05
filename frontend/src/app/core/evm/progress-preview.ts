import { MeasurementMethod } from '../api/models/activity';
import { UndefinedIndicator } from '../api/models/evm';

/** Cifras de la actividad sobre las que se simula un avance. */
export interface ProgressPreviewInput {
  readonly budgetAtCompletion: number;
  readonly plannedProgressPercent: number;
  readonly actualProgressPercent: number;
  readonly actualCost: number;
  readonly measurementMethod: MeasurementMethod;
  /** Si la actividad ha arrancado; solo lo consulta la regla 50 / 50. Ver {@link isStarted}. */
  readonly started: boolean;
}

/** Resultado de la simulación, con la misma semántica de nulos que el backend. */
export interface ProgressPreview {
  /** Porcentajes que la regla reconoce, que con las reglas de umbral no son los declarados. */
  readonly effectivePlannedProgressPercent: number;
  readonly effectiveActualProgressPercent: number;
  readonly plannedValue: number;
  readonly earnedValue: number;
  readonly actualCost: number;
  readonly costVariance: number;
  readonly scheduleVariance: number;
  readonly costPerformanceIndex: UndefinedIndicator;
  readonly schedulePerformanceIndex: UndefinedIndicator;
  readonly estimateAtCompletion: UndefinedIndicator;
  readonly varianceAtCompletion: UndefinedIndicator;
}

const PERCENT_BASE = 100;
const NONE = 0;
const HALF = 50;
const FULL = 100;

/**
 * Una actividad ha arrancado si tiene fecha real de inicio o un avance declarado mayor que cero.
 * Es una unión: quien usa 50 / 50 no estima avance intermedio y deja el porcentaje a cero hasta
 * cerrar, así que deducir el arranque solo del porcentaje anularía la regla.
 */
export function isStarted(actualStartDate: string | null, actualProgressPercent: number): boolean {
  return (actualStartDate !== null && actualStartDate !== '') || actualProgressPercent > NONE;
}

/**
 * Porcentaje que una regla de medición reconoce a partir del declarado. Espejo de la regla del
 * servidor: se aplica igual al lado planificado y al ganado.
 */
export function recognisedPercent(
  method: MeasurementMethod,
  reportedPercent: number,
  started: boolean,
): number {
  switch (method) {
    case 'FIXED_0_100':
      return reportedPercent >= FULL ? FULL : NONE;
    case 'FIXED_50_50':
      if (reportedPercent >= FULL) {
        return FULL;
      }
      return started ? HALF : NONE;
    default:
      // Porcentaje completado tal cual; con hitos ponderados el declarado ya viene derivado.
      return reportedPercent;
  }
}

/**
 * Simula los indicadores mientras el usuario mueve el porcentaje de avance.
 *
 * ES UNA ESTIMACIÓN, no el cálculo oficial. El servidor es el dueño de la aritmética y la hace en
 * `BigDecimal`; aquí se trabaja en coma flotante solo para dar realimentación inmediata en el
 * formulario. Tras guardar, lo que queda en pantalla son los valores que devuelve la respuesta.
 *
 * Reproduce las reglas del dominio, incluida la indefinición: sin costo real el CPI no existe, sin
 * valor planificado no existe el SPI, y el EAC hereda la indefinición del CPI, también cuando el
 * CPI existe pero vale cero. La regla de medición se aplica a los dos lados, como en el servidor.
 */
export function previewProgress(input: ProgressPreviewInput): ProgressPreview {
  const effectivePlannedProgressPercent = recognisedPercent(
    input.measurementMethod,
    input.plannedProgressPercent,
    input.plannedProgressPercent > NONE,
  );
  const effectiveActualProgressPercent = recognisedPercent(
    input.measurementMethod,
    input.actualProgressPercent,
    input.started,
  );
  const plannedValue = (input.budgetAtCompletion * effectivePlannedProgressPercent) / PERCENT_BASE;
  const earnedValue = (input.budgetAtCompletion * effectiveActualProgressPercent) / PERCENT_BASE;
  const actualCost = input.actualCost;

  const costPerformanceIndex = actualCost === 0 ? null : earnedValue / actualCost;
  const schedulePerformanceIndex = plannedValue === 0 ? null : earnedValue / plannedValue;

  const estimateAtCompletion =
    costPerformanceIndex === null || costPerformanceIndex === 0
      ? null
      : input.budgetAtCompletion / costPerformanceIndex;
  const varianceAtCompletion =
    estimateAtCompletion === null ? null : input.budgetAtCompletion - estimateAtCompletion;

  return {
    effectivePlannedProgressPercent,
    effectiveActualProgressPercent,
    plannedValue,
    earnedValue,
    actualCost,
    costVariance: earnedValue - actualCost,
    scheduleVariance: earnedValue - plannedValue,
    costPerformanceIndex,
    schedulePerformanceIndex,
    estimateAtCompletion,
    varianceAtCompletion,
  };
}
