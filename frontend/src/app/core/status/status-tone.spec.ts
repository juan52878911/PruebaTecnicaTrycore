import { EvmIndicators } from '../api/models/evm';
import {
  combinedStatusLabel,
  costLabel,
  costTone,
  overallTone,
  riskLevel,
  scheduleLabel,
  scheduleTone,
} from './status-tone';

function indicators(overrides: Partial<EvmIndicators>): EvmIndicators {
  return {
    plannedValue: 0,
    earnedValue: 0,
    actualCost: 0,
    costVariance: 0,
    scheduleVariance: 0,
    costPerformanceIndex: null,
    schedulePerformanceIndex: null,
    costStatus: { status: 'NOT_APPLICABLE', message: 'No aplica' },
    scheduleStatus: { status: 'NOT_APPLICABLE', message: 'No aplica' },
    estimateAtCompletion: null,
    varianceAtCompletion: null,
    ...overrides,
  };
}

describe('tono derivado del estado del servidor', () => {
  it('pinta en verde lo que está en presupuesto o por debajo', () => {
    expect(costTone('UNDER_BUDGET')).toBe('success');
    expect(costTone('ON_BUDGET')).toBe('success');
  });

  it('pinta el sobrecosto en coral y el atraso en oliva, como el diseño', () => {
    expect(costTone('OVER_BUDGET')).toBe('danger');
    expect(scheduleTone('BEHIND_SCHEDULE')).toBe('warning');
  });

  it('deja en gris lo que el servidor declara no aplicable', () => {
    expect(costTone('NOT_APPLICABLE')).toBe('neutral');
    expect(scheduleTone('NOT_APPLICABLE')).toBe('neutral');
  });

  it('toma el tono más grave de los dos estados para la fila', () => {
    const overCostAndLate = indicators({
      costStatus: { status: 'OVER_BUDGET', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', message: '' },
    });
    const onlyLate = indicators({
      costStatus: { status: 'ON_BUDGET', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', message: '' },
    });
    const healthy = indicators({
      costStatus: { status: 'UNDER_BUDGET', message: '' },
      scheduleStatus: { status: 'AHEAD_OF_SCHEDULE', message: '' },
    });

    expect(overallTone(overCostAndLate)).toBe('danger');
    expect(overallTone(onlyLate)).toBe('warning');
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
      costStatus: { status: 'OVER_BUDGET', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', message: '' },
    });

    expect(combinedStatusLabel(value)).toBe('Sobre presupuesto · atrasado');
  });

  it('no combina cuando uno de los dos no aplica', () => {
    const value = indicators({
      costStatus: { status: 'NOT_APPLICABLE', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', message: '' },
    });

    expect(combinedStatusLabel(value)).toBe('Sin costo registrado');
  });
});

describe('resalte de riesgo por umbral', () => {
  const warning = 0.95;
  const critical = 0.8;

  it('marca como crítica la actividad cuyo peor índice cae bajo el umbral crítico', () => {
    const value = indicators({ costPerformanceIndex: 0.6, schedulePerformanceIndex: 0.64 });

    expect(riskLevel(value, warning, critical)).toBe('critical');
  });

  it('marca en riesgo la que queda entre los dos umbrales', () => {
    const value = indicators({ costPerformanceIndex: 1.03, schedulePerformanceIndex: 0.92 });

    expect(riskLevel(value, warning, critical)).toBe('warning');
  });

  it('no marca nada cuando los dos índices superan el umbral de aviso', () => {
    const value = indicators({ costPerformanceIndex: 1.05, schedulePerformanceIndex: 1.02 });

    expect(riskLevel(value, warning, critical)).toBe('none');
  });

  it('trata el umbral como estrictamente menor: 0,95 exacto no es riesgo', () => {
    const value = indicators({ costPerformanceIndex: 0.95, schedulePerformanceIndex: 1 });

    expect(riskLevel(value, warning, critical)).toBe('none');
  });

  it('no inventa riesgo donde solo falta el dato', () => {
    const value = indicators({ costPerformanceIndex: null, schedulePerformanceIndex: null });

    expect(riskLevel(value, warning, critical)).toBe('none');
  });

  it('evalúa el índice que sí existe cuando el otro es nulo', () => {
    const value = indicators({ costPerformanceIndex: null, schedulePerformanceIndex: 0.4 });

    expect(riskLevel(value, warning, critical)).toBe('critical');
  });

  it('un índice de cero sí es un riesgo crítico, porque el índice está definido', () => {
    const value = indicators({ costPerformanceIndex: 0, schedulePerformanceIndex: 1 });

    expect(riskLevel(value, warning, critical)).toBe('critical');
  });

  it('respeta los umbrales que el usuario configure', () => {
    const value = indicators({ costPerformanceIndex: 0.9, schedulePerformanceIndex: 1 });

    expect(riskLevel(value, 0.95, 0.8)).toBe('warning');
    expect(riskLevel(value, 0.95, 0.92)).toBe('critical');
    expect(riskLevel(value, 0.85, 0.8)).toBe('none');
  });
});
