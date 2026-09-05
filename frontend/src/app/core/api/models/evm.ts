export type CostStatusCode = 'UNDER_BUDGET' | 'ON_BUDGET' | 'OVER_BUDGET' | 'NOT_APPLICABLE';

export type ScheduleStatusCode =
  'AHEAD_OF_SCHEDULE' | 'ON_SCHEDULE' | 'BEHIND_SCHEDULE' | 'NOT_APPLICABLE';

/**
 * Gravedad de la desviación, medida contra los umbrales de tolerancia del servidor.
 *
 * Es distinta del estado: el estado es un hecho aritmético y la severidad una política. Un CPI de
 * 0,9857 está `OVER_BUDGET` porque se gastó más de lo que se ganó, y su severidad es `WARNING`
 * porque la desviación cabe dentro de lo admitido.
 */
export type Severity = 'NONE' | 'WARNING' | 'CRITICAL' | 'NOT_APPLICABLE';

/**
 * Estado de un índice con su gravedad y el motivo, ya redactado en español por el backend.
 *
 * Regla del contrato: quien pinta un color usa `severity`; quien muestra un texto, `status`.
 */
export interface IndexInterpretation<TStatus extends string> {
  readonly status: TStatus;
  readonly severity: Severity;
  readonly message: string;
}

/** Umbrales con los que el servidor clasificó la severidad. Bandas cerradas por abajo. */
export interface PerformanceThresholds {
  readonly warning: number;
  readonly critical: number;
}

/** Las tres fórmulas estándar de estimación del costo final. */
export type EstimateFormula =
  'BAC_OVER_CPI' | 'AC_PLUS_REMAINING' | 'AC_PLUS_REMAINING_OVER_CPI_SPI';

/**
 * Una estimación del costo final con su supuesto.
 *
 * Una fórmula que no se puede calcular devuelve `null` con `applicable: false`, y no se sustituye
 * por otra que sí aplique: cada una responde a una pregunta distinta sobre el futuro.
 */
export interface CompletionEstimate {
  readonly formula: EstimateFormula;
  readonly estimateAtCompletion: UndefinedIndicator;
  readonly varianceAtCompletion: UndefinedIndicator;
  readonly applicable: boolean;
  readonly assumption: string;
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
  /** Fórmula con la que se calcularon el EAC y el VAC de este nivel. */
  readonly estimateFormula: EstimateFormula;
  /** Las tres estimaciones sobre estas mismas cifras. */
  readonly estimates: readonly CompletionEstimate[];
  readonly thresholds: PerformanceThresholds;
}

/** Las cuatro cifras base en dinero, de las que se derivan todos los indicadores. */
export interface EvmTotals {
  readonly budgetAtCompletion: number;
  readonly plannedValue: number;
  readonly earnedValue: number;
  readonly actualCost: number;
}
