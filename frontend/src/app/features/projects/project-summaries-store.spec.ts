import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FAKE_ADAPTER_HANDLE, provideApiTesting } from '../../core/api/testing/fake-adapter';
import { ProjectSummariesStore } from './project-summaries-store';

const BASE = 'http://localhost/api/v1';

function interpretation(status: string, severity: string) {
  return { status, severity, message: status };
}

function summary(id: number, name: string, manager: string | null, activityCount: number) {
  const empty = activityCount === 0;
  return {
    id,
    name,
    description: null,
    manager,
    createdAt: '2026-09-03T21:00:00Z',
    updatedAt: '2026-09-03T21:00:00Z',
    activityCount,
    totals: {
      budgetAtCompletion: empty ? 0 : 2_000_000,
      plannedValue: empty ? 0 : 1_097_500,
      earnedValue: empty ? 0 : 992_500,
      actualCost: empty ? 0 : 1_258_000,
    },
    indicators: {
      plannedValue: empty ? 0 : 1_097_500,
      earnedValue: empty ? 0 : 992_500,
      actualCost: empty ? 0 : 1_258_000,
      costVariance: empty ? 0 : -265_500,
      scheduleVariance: empty ? 0 : -105_000,
      costPerformanceIndex: empty ? null : 0.789,
      schedulePerformanceIndex: empty ? null : 0.9043,
      estimateAtCompletion: empty ? null : 2_535_012.59,
      varianceAtCompletion: empty ? null : -535_012.59,
      estimateFormula: 'BAC_OVER_CPI',
      estimates: [],
      costStatus: empty
        ? interpretation('NOT_APPLICABLE', 'NOT_APPLICABLE')
        : interpretation('OVER_BUDGET', 'CRITICAL'),
      scheduleStatus: empty
        ? interpretation('NOT_APPLICABLE', 'NOT_APPLICABLE')
        : interpretation('BEHIND_SCHEDULE', 'CRITICAL'),
      thresholds: { warning: 1, critical: 0.95 },
    },
  };
}

/**
 * `resource()` arranca su carga desde un efecto: hay que hacer tick y esperar a que la aplicación
 * esté estable, no basta con `await Promise.resolve()`.
 */
async function settle(): Promise<void> {
  TestBed.tick();
  await TestBed.inject(ApplicationRef).whenStable();
}

describe('ProjectSummariesStore', () => {
  it('carga todos los consolidados en una sola petición con includeIndicators', async () => {
    TestBed.configureTestingModule({
      providers: provideApiTesting({
        routes: [
          {
            method: 'get',
            url: `${BASE}/projects`,
            status: 200,
            data: [
              summary(1, 'Planta Solar Norte', 'Alicia Ramos', 5),
              summary(4, 'Data warehouse fase II', null, 0),
            ],
          },
        ],
        config: { baseUrl: BASE },
      }),
    });
    const store = TestBed.inject(ProjectSummariesStore);
    const handle = TestBed.inject(FAKE_ADAPTER_HANDLE);

    store.rows();
    await settle();

    expect(handle.requests).toHaveLength(1);
    expect(handle.requests[0]?.params).toEqual({ includeIndicators: true });

    const [solar, warehouse] = store.rows();
    expect(solar?.meta).toBe('5 actividades · Alicia Ramos');
    expect(solar?.budgetAtCompletion).toBe(2_000_000);
    expect(solar?.costTone).toBe('danger');
    expect(solar?.statusLabel).not.toBe('Sin datos');

    expect(warehouse?.meta).toBe('0 actividades');
    expect(warehouse?.hasData).toBe(false);
    expect(warehouse?.statusLabel).toBe('Sin datos');
    expect(warehouse?.statusTone).toBe('neutral');
    expect(store.totalActivities()).toBe(5);
  });
});
