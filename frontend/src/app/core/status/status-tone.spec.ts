import { EvmIndicators, Severity } from '../api/models/evm';
import {
  combinedStatusLabel,
  costLabel,
  costTone,
  isAtRisk,
  overallTone,
  scheduleLabel,
  scheduleTone,
  severityTone,
} from './status-tone';

function indicators(overrides: {
  readonly costStatus?: EvmIndicators['costStatus'];
  readonly scheduleStatus?: EvmIndicators['scheduleStatus'];
}): EvmIndicators {
  return {
    plannedValue: 0,
    earnedValue: 0,
    actualCost: 0,
    costVariance: 0,
    scheduleVariance: 0,
    costPerformanceIndex: null,
    schedulePerformanceIndex: null,
    estimateAtCompletion: null,
    varianceAtCompletion: null,
    estimateFormula: 'BAC_OVER_CPI',
    estimates: [],
    thresholds: { warning: 1, critical: 0.95 },
    costStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: 'No aplica' },
    scheduleStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: 'No aplica' },
    ...overrides,
  };
}

function cost(status: EvmIndicators['costStatus']['status'], severity: Severity) {
  return { status, severity, message: '' };
}

function schedule(status: EvmIndicators['scheduleStatus']['status'], severity: Severity) {
  return { status, severity, message: '' };
}

describe('tono derivado de la severidad del servidor', () => {
  it('traduce las cuatro severidades a los colores del diseño', () => {
    expect(severityTone('NONE')).toBe('success');
    expect(severityTone('WARNING')).toBe('warning');
    expect(severityTone('CRITICAL')).toBe('danger');
    expect(severityTone('NOT_APPLICABLE')).toBe('neutral');
  });

  /**
   * El caso que motivó el cambio: un CPI de 0,9857 está sobre presupuesto, pero dentro de la
   * tolerancia. Antes el color salía del estado y lo pintaba de rojo, contradiciendo al servidor.
   */
  it('pinta en oliva una desviación que el servidor admite, aunque el estado sea desfavorable', () => {
    const value = indicators({ costStatus: cost('OVER_BUDGET', 'WARNING') });

    expect(costTone(value)).toBe('warning');
    expect(costLabel(value.costStatus.status)).toBe('Sobre presupuesto');
  });

  it('pinta en coral la desviación que el servidor considera crítica', () => {
    expect(costTone(indicators({ costStatus: cost('OVER_BUDGET', 'CRITICAL') }))).toBe('danger');
  });

  it('pinta en verde lo que el servidor no señala', () => {
    expect(costTone(indicators({ costStatus: cost('UNDER_BUDGET', 'NONE') }))).toBe('success');
    expect(scheduleTone(indicators({ scheduleStatus: schedule('ON_SCHEDULE', 'NONE') }))).toBe(
      'success',
    );
  });

  it('deja en gris lo que no aplica', () => {
    expect(costTone(indicators({}))).toBe('neutral');
    expect(scheduleTone(indicators({}))).toBe('neutral');
  });

  it('toma el tono más grave de los dos para la fila', () => {
    const worst = indicators({
      costStatus: cost('OVER_BUDGET', 'WARNING'),
      scheduleStatus: schedule('BEHIND_SCHEDULE', 'CRITICAL'),
    });
    const onlyWarning = indicators({
      costStatus: cost('ON_BUDGET', 'NONE'),
      scheduleStatus: schedule('BEHIND_SCHEDULE', 'WARNING'),
    });
    const healthy = indicators({
      costStatus: cost('UNDER_BUDGET', 'NONE'),
      scheduleStatus: schedule('AHEAD_OF_SCHEDULE', 'NONE'),
    });

    expect(overallTone(worst)).toBe('danger');
    expect(overallTone(onlyWarning)).toBe('warning');
    expect(overallTone(healthy)).toBe('success');
    expect(overallTone(indicators({}))).toBe('neutral');
  });
});

describe('rótulos de estado', () => {
  it('usa el vocabulario del diseño', () => {
    expect(costLabel('OVER_BUDGET')).toBe('Sobre presupuesto');
    expect(scheduleLabel('BEHIND_SCHEDULE')).toBe('Atrasado');
  });

  it('combina los dos estados en una sola línea', () => {
    const value = indicators({
      costStatus: cost('OVER_BUDGET', 'CRITICAL'),
      scheduleStatus: schedule('BEHIND_SCHEDULE', 'CRITICAL'),
    });

    expect(combinedStatusLabel(value)).toBe('Sobre presupuesto · atrasado');
  });

  it('no combina cuando uno de los dos no aplica', () => {
    const value = indicators({ scheduleStatus: schedule('BEHIND_SCHEDULE', 'CRITICAL') });

    expect(combinedStatusLabel(value)).toBe('Sin costo registrado');
  });
});

describe('señalado de riesgo', () => {
  it('señala lo que el servidor marca con aviso o con criticidad', () => {
    expect(isAtRisk(indicators({ costStatus: cost('OVER_BUDGET', 'WARNING') }))).toBe(true);
    expect(isAtRisk(indicators({ scheduleStatus: schedule('BEHIND_SCHEDULE', 'CRITICAL') }))).toBe(
      true,
    );
  });

  it('no señala lo que va bien', () => {
    const value = indicators({
      costStatus: cost('UNDER_BUDGET', 'NONE'),
      scheduleStatus: schedule('AHEAD_OF_SCHEDULE', 'NONE'),
    });

    expect(isAtRisk(value)).toBe(false);
  });

  it('no inventa riesgo donde solo falta el dato', () => {
    expect(isAtRisk(indicators({}))).toBe(false);
  });
});
