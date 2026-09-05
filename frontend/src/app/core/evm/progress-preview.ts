import { UndefinedIndicator } from '../api/models/evm';

/** Cifras de la actividad sobre las que se simula un avance. */
export interface ProgressPreviewInput {
  readonly budgetAtCompletion: number;
  readonly plannedProgressPercent: number;
  readonly actualProgressPercent: number;
  readonly actualCost: number;
}

/** Resultado de la simulación, con la misma semántica de nulos que el backend. */
export interface ProgressPreview {
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

/**
 * Simula los indicadores mientras el usuario mueve el porcentaje de avance.
 *
 * ES UNA ESTIMACIÓN, no el cálculo oficial. El servidor es el dueño de la aritmética y la hace en
 * `BigDecimal`; aquí se trabaja en coma flotante solo para dar realimentación inmediata en el
 * formulario. Tras guardar, lo que queda en pantalla son los valores que devuelve la respuesta.
 *
 * Reproduce las reglas del dominio, incluida la indefinición: sin costo real el CPI no existe, sin
 * valor planificado no existe el SPI, y el EAC hereda la indefinición del CPI, también cuando el
 * CPI existe pero vale cero.
 */
export function previewProgress(input: ProgressPreviewInput): ProgressPreview {
  const plannedValue = (input.budgetAtCompletion * input.plannedProgressPercent) / PERCENT_BASE;
  const earnedValue = (input.budgetAtCompletion * input.actualProgressPercent) / PERCENT_BASE;
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
