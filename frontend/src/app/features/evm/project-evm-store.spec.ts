import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EvmIndicators } from '../../core/api/models/evm';
import { FakeRoute, provideApiTesting } from '../../core/api/testing/fake-adapter';
import { ProjectEvmStore } from './project-evm-store';

const BASE = 'http://localhost/api/v1';

function indicators(overrides: Partial<EvmIndicators> = {}): EvmIndicators {
  return {
    plannedValue: 1_240_000,
    earnedValue: 1_117_500,
    actualCost: 1_258_000,
    costVariance: -140_500,
    scheduleVariance: -122_500,
    costPerformanceIndex: 0.8883,
    schedulePerformanceIndex: 0.9012,
    estimateAtCompletion: 1_913_768.99,
    varianceAtCompletion: -213_768.99,
    estimateFormula: 'BAC_OVER_CPI',
    estimates: [],
    thresholds: { warning: 1, critical: 0.95 },
    costStatus: { status: 'OVER_BUDGET', severity: 'WARNING', message: 'Sobre presupuesto' },
    scheduleStatus: { status: 'BEHIND_SCHEDULE', severity: 'WARNING', message: 'Atrasado' },
    ...overrides,
  };
}

function activity(id: number, name: string, overrides: Partial<EvmIndicators> = {}) {
  return {
    id,
    projectId: 1,
    name,
    budgetAtCompletion: 400_000,
    plannedProgressPercent: 45,
    actualProgressPercent: 29,
    actualCost: 194_000,
    plannedStartDate: '2026-08-01',
    plannedEndDate: '2026-11-30',
    actualStartDate: null,
    actualEndDate: null,
    measurementMethod: 'PERCENT_COMPLETE',
    measurementMethodDescription: 'Porcentaje completado',
    effectivePlannedProgressPercent: 45,
    effectiveActualProgressPercent: 29,
    derivedProgressPercent: null,
    milestones: [],
    indicators: indicators(overrides),
  };
}

const SUMMARY = {
  project: {
    id: 1,
    name: 'Planta Solar Norte',
    description: null,
    manager: null,
    createdAt: '2026-09-03T21:00:00Z',
    updatedAt: '2026-09-03T21:00:00Z',
  },
  budgetAtCompletion: 1_700_000,
  indicators: indicators(),
  activities: [
    activity(10, 'Obra civil', {
      costStatus: { status: 'OVER_BUDGET', severity: 'WARNING', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', severity: 'WARNING', message: '' },
    }),
    activity(11, 'Pruebas', {
      costStatus: { status: 'OVER_BUDGET', severity: 'CRITICAL', message: '' },
      scheduleStatus: { status: 'BEHIND_SCHEDULE', severity: 'CRITICAL', message: '' },
    }),
    activity(12, 'Montaje', {
      costStatus: { status: 'UNDER_BUDGET', severity: 'NONE', message: '' },
      scheduleStatus: { status: 'AHEAD_OF_SCHEDULE', severity: 'NONE', message: '' },
    }),
  ],
};

const TIMELINE = {
  project: SUMMARY.project,
  points: [
    {
      cutoffDate: '2026-07-31',
      notes: 'Cierre de julio',
      totals: {
        budgetAtCompletion: 1_700_000,
        plannedValue: 990_000,
        earnedValue: 920_000,
        actualCost: 984_000,
      },
      indicators: indicators(),
    },
    {
      cutoffDate: '2026-08-31',
      notes: 'Cierre de agosto',
      totals: {
        budgetAtCompletion: 1_700_000,
        plannedValue: 1_240_000,
        earnedValue: 1_117_500,
        actualCost: 1_258_000,
      },
      indicators: indicators(),
    },
  ],
};

async function settle(): Promise<void> {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

function configure(routes: readonly FakeRoute[]): ProjectEvmStore {
  TestBed.configureTestingModule({
    providers: [...provideApiTesting({ routes, config: { baseUrl: BASE } }), ProjectEvmStore],
  });
  return TestBed.inject(ProjectEvmStore);
}

const HAPPY_ROUTES: readonly FakeRoute[] = [
  { method: 'get', url: `${BASE}/projects/1/evm`, status: 200, data: SUMMARY },
  { method: 'get', url: `${BASE}/projects/1/timeline`, status: 200, data: TIMELINE },
];

describe('ProjectEvmStore', () => {
  it('no carga nada mientras no haya proyecto seleccionado', async () => {
    const store = configure(HAPPY_ROUTES);

    await settle();

    expect(store.summary()).toBeUndefined();
    expect(store.isLoading()).toBe(false);
  });

  it('carga consolidado y serie temporal al seleccionar un proyecto', async () => {
    const store = configure(HAPPY_ROUTES);

    store.select(1);
    await settle();

    expect(store.summary()?.project.name).toBe('Planta Solar Norte');
    expect(store.budgetAtCompletion()).toBe(1_700_000);
    expect(store.activityList()).toHaveLength(3);
    expect(store.timeline()).toHaveLength(2);
    expect(store.hasTimeline()).toBe(true);
    expect(store.error()).toBeNull();
  });

  it('el último punto de la serie coincide con el consolidado en vivo', async () => {
    const store = configure(HAPPY_ROUTES);
    store.select(1);
    await settle();

    const last = store.timeline().at(-1);

    expect(last?.totals.earnedValue).toBe(store.indicators()?.earnedValue);
    expect(last?.totals.actualCost).toBe(store.indicators()?.actualCost);
  });

  it('señala solo las actividades que el servidor marca con desviación', async () => {
    const store = configure(HAPPY_ROUTES);
    store.select(1);
    await settle();

    const atRisk = store.activitiesAtRisk();

    // El nivel no se calcula aquí: sale de la severidad que trae cada índice.
    expect(atRisk.map((entry) => entry.activity.name)).toEqual(['Obra civil', 'Pruebas']);
    expect(atRisk.find((entry) => entry.activity.name === 'Pruebas')?.critical).toBe(true);
    expect(atRisk.find((entry) => entry.activity.name === 'Pruebas')?.tone).toBe('danger');
    expect(atRisk.find((entry) => entry.activity.name === 'Obra civil')?.critical).toBe(false);
    expect(atRisk.find((entry) => entry.activity.name === 'Obra civil')?.tone).toBe('warning');
  });

  it('reconoce el proyecto sin actividades y sin cortes', async () => {
    const store = configure([
      {
        method: 'get',
        url: `${BASE}/projects/4/evm`,
        status: 200,
        data: { ...SUMMARY, activities: [], budgetAtCompletion: 0 },
      },
      {
        method: 'get',
        url: `${BASE}/projects/4/timeline`,
        status: 200,
        data: { project: SUMMARY.project, points: [] },
      },
    ]);

    store.select(4);
    await settle();

    expect(store.hasActivities()).toBe(false);
    expect(store.hasTimeline()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('publica el fallo de carga sin romper al leer el consolidado', async () => {
    const store = configure([
      {
        method: 'get',
        url: `${BASE}/projects/1/evm`,
        status: 404,
        data: { status: 404, detail: 'El proyecto 1 no existe' },
      },
      { method: 'get', url: `${BASE}/projects/1/timeline`, status: 200, data: TIMELINE },
    ]);

    store.select(1);
    await settle();

    expect(store.error()?.kind).toBe('not-found');
    expect(() => store.summary()).not.toThrow();
    expect(store.summary()).toBeUndefined();
  });

  it('traduce el corte duplicado en un conflicto, no en un error de validación', async () => {
    const store = configure([
      ...HAPPY_ROUTES,
      {
        method: 'post',
        url: `${BASE}/projects/1/measurements`,
        status: 409,
        data: { status: 409, detail: 'Ya existe un corte del proyecto en esa fecha' },
      },
    ]);
    store.select(1);
    await settle();

    const created = await store.createMeasurement(1, {
      cutoffDate: '2026-08-31',
      notes: null,
    });

    expect(created).toBe(false);
    expect(store.error()?.kind).toBe('conflict');
    expect(store.error()?.detail).toBe('Ya existe un corte del proyecto en esa fecha');
  });

  it('publica el error de validación por campo al guardar una actividad', async () => {
    const store = configure([
      ...HAPPY_ROUTES,
      {
        method: 'post',
        url: `${BASE}/projects/1/activities`,
        status: 400,
        data: {
          status: 400,
          detail: 'La petición contiene campos inválidos',
          errors: [{ field: 'plannedProgressPercent', message: 'debe estar entre 0 y 100' }],
        },
      },
    ]);
    store.select(1);
    await settle();

    const created = await store.createActivity(1, {
      name: 'Nueva',
      budgetAtCompletion: 1000,
      plannedProgressPercent: 150,
      actualProgressPercent: 0,
      actualCost: 0,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      measurementMethod: null,
    });

    expect(created).toBeNull();
    expect(store.error()?.fieldError('plannedProgressPercent')).toBe('debe estar entre 0 y 100');
  });
});
