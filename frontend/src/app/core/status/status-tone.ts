import { CostStatusCode, EvmIndicators, ScheduleStatusCode } from '../api/models/evm';

/**
 * Familia de color de un estado.
 *
 * `neutral` es el gris de "sin datos"; `warning` es el oliva del atraso; `danger` es el coral del
 * sobrecosto; `success` es el verde de lo que va bien.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Color a partir del estado que devuelve el servidor, no de un umbral numérico propio.
 *
 * El prototipo coloreaba por umbral (verde a partir de 1, oliva a partir de 0,95, coral por
 * debajo). Aquí manda el backend: pintar un CPI de 0,98 en oliva mientras el distintivo dice
 * "Sobre presupuesto" sería contradecir el texto con el color. Los umbrales configurables en
 * Ajustes son otra cosa: alimentan el resalte de riesgo, no el estado.
 */
export function costTone(status: CostStatusCode): Tone {
  switch (status) {
    case 'UNDER_BUDGET':
    case 'ON_BUDGET':
      return 'success';
    case 'OVER_BUDGET':
      return 'danger';
    case 'NOT_APPLICABLE':
      return 'neutral';
  }
}

export function scheduleTone(status: ScheduleStatusCode): Tone {
  switch (status) {
    case 'AHEAD_OF_SCHEDULE':
    case 'ON_SCHEDULE':
      return 'success';
    case 'BEHIND_SCHEDULE':
      return 'warning';
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
  const tones: readonly Tone[] = [
    costTone(indicators.costStatus.status),
    scheduleTone(indicators.scheduleStatus.status),
  ];
  if (tones.includes('danger')) {
    return 'danger';
  }
  if (tones.includes('warning')) {
    return 'warning';
  }
  return tones.every((tone) => tone === 'neutral') ? 'neutral' : 'success';
}

/** Nivel de riesgo según los umbrales que el usuario configura en Ajustes. */
export type RiskLevel = 'critical' | 'warning' | 'none';

/**
 * Resalte de riesgo, independiente del estado.
 *
 * Reproduce la tarjeta "Actividades en riesgo" del diseño ("CPI o SPI por debajo de 0,95"). Un
 * índice indefinido no es un riesgo: es una ausencia de dato, y tratarlo como crítico llenaría el
 * panel de alarmas falsas en cuanto se registra una actividad sin costo.
 */
export function riskLevel(
  indicators: EvmIndicators,
  warningThreshold: number,
  criticalThreshold: number,
): RiskLevel {
  const indices = [indicators.costPerformanceIndex, indicators.schedulePerformanceIndex].filter(
    (value): value is number => value !== null,
  );
  if (indices.length === 0) {
    return 'none';
  }
  const worst = Math.min(...indices);
  if (worst < criticalThreshold) {
    return 'critical';
  }
  return worst < warningThreshold ? 'warning' : 'none';
}
