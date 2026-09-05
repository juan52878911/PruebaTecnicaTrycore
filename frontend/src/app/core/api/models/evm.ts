export type CostStatusCode = 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET' | 'NOT_APPLICABLE';

export type ScheduleStatusCode =
  'AHEAD_OF_SCHEDULE' | 'ON_SCHEDULE' | 'BEHIND_SCHEDULE' | 'NOT_APPLICABLE';

/** Estado de un índice con el motivo que lo explica, ya redactado en español por el backend. */
export interface IndexInterpretation<TStatus extends string> {
  readonly status: TStatus;
  readonly message: string;
}

/**
 * Indicador que puede no estar definido.
 *
 * `null` significa INDEFINIDO, nunca cero: CPI cuando el costo real es cero, SPI cuando el valor
 * planificado es cero, y EAC y VAC que heredan esa indefinición. Convertirlo a 0 al pintarlo
 * sería mentir sobre el estado del proyecto.
 *
 * Ojo con el caso contrario: un CPI de `0` sí está definido. Con avance real cero y costo
 * incurrido, el índice vale cero y el estado es `OVER_BUDGET`, pero el EAC y el VAC son nulos
 * porque dividir el presupuesto entre cero no da un número.
 */
export type UndefinedIndicator = number | null;

/** Los once campos que devuelve el backend para cualquier conjunto de cifras. */
export interface EvmIndicators {
  readonly plannedValue: number;
  readonly earnedValue: number;
  readonly actualCost: number;
  readonly costVariance: number;
  readonly scheduleVariance: number;
  readonly costPerformanceIndex: UndefinedIndicator;
  readonly schedulePerformanceIndex: UndefinedIndicator;
  readonly estimateAtCompletion: UndefinedIndicator;
  readonly varianceAtCompletion: UndefinedIndicator;
  readonly costStatus: IndexInterpretation<CostStatusCode>;
  readonly scheduleStatus: IndexInterpretation<ScheduleStatusCode>;
}

/** Las cuatro cifras base en dinero, de las que se derivan todos los indicadores. */
export interface EvmTotals {
  readonly budgetAtCompletion: number;
  readonly plannedValue: number;
  readonly earnedValue: number;
  readonly actualCost: number;
}
