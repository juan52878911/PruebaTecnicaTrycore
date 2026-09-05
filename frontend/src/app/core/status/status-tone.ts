import { CostStatusCode, EvmIndicators, ScheduleStatusCode, Severity } from '../api/models/evm';

/**
 * Familia de color de un estado.
 *
 * `neutral` es el gris de "sin datos"; `warning` es el oliva del atraso; `danger` es el coral del
 * sobrecosto; `success` es el verde de lo que va bien.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Color a partir de la severidad que calcula el servidor.
 *
 * Es la regla del contrato: quien pinta un color usa `severity`, quien muestra un texto usa
 * `status`. Antes el color salía del estado, y eso obligaba a pintar de rojo un CPI de 0,9857 que
 * está sobre presupuesto pero dentro de la tolerancia. Ahora las tres bandas del diseño —verde,
 * oliva y coral— salen del mismo sitio que el texto y no pueden contradecirlo.
 */
export function severityTone(severity: Severity): Tone {
  switch (severity) {
    case 'NONE':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'CRITICAL':
      return 'danger';
    case 'NOT_APPLICABLE':
      return 'neutral';
  }
}

const COST_LABELS: Record<CostStatusCode, string> = {
  UNDER_BUDGET: 'Bajo presupuesto',
  ON_BUDGET: 'En presupuesto',
  OVER_BUDGET: 'Sobre presupuesto',
  NOT_APPLICABLE: 'Sin costo registrado',
};

const SCHEDULE_LABELS: Record<ScheduleStatusCode, string> = {
  AHEAD_OF_SCHEDULE: 'Adelantado',
  ON_SCHEDULE: 'En cronograma',
  BEHIND_SCHEDULE: 'Atrasado',
  NOT_APPLICABLE: 'Sin avance planificado',
};

export function costLabel(status: CostStatusCode): string {
  return COST_LABELS[status];
}

export function scheduleLabel(status: ScheduleStatusCode): string {
  return SCHEDULE_LABELS[status];
}

/** Color del estado de costo de unos indicadores. */
export function costTone(indicators: EvmIndicators): Tone {
  return severityTone(indicators.costStatus.severity);
}

/** Color del estado de cronograma de unos indicadores. */
export function scheduleTone(indicators: EvmIndicators): Tone {
  return severityTone(indicators.scheduleStatus.severity);
}

/** Resumen de una línea que combina los dos estados, como los distintivos del diseño. */
export function combinedStatusLabel(indicators: EvmIndicators): string {
  const cost = costLabel(indicators.costStatus.status);
  const schedule = scheduleLabel(indicators.scheduleStatus.status);
  if (indicators.costStatus.status === 'NOT_APPLICABLE') {
    return cost;
  }
  if (indicators.scheduleStatus.status === 'NOT_APPLICABLE') {
    return cost;
  }
  return `${cost} · ${schedule.toLowerCase()}`;
}

/** El tono más grave de los dos, que es el que define el color de la fila. */
export function overallTone(indicators: EvmIndicators): Tone {
  const tones: readonly Tone[] = [costTone(indicators), scheduleTone(indicators)];
  if (tones.includes('danger')) {
    return 'danger';
  }
  if (tones.includes('warning')) {
    return 'warning';
  }
  return tones.every((tone) => tone === 'neutral') ? 'neutral' : 'success';
}

/** Una actividad está señalada si el servidor le asignó severidad de aviso o crítica. */
export function isAtRisk(indicators: EvmIndicators): boolean {
  const tone = overallTone(indicators);
  return tone === 'warning' || tone === 'danger';
}
