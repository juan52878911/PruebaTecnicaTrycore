import type { Page } from '@playwright/test';

/**
 * API simulada con las formas del contrato. Las cifras son las de la semilla de demostración de
 * Planta Solar Norte, para que lo que se ve en la prueba sea lo mismo que se ve en local.
 */
const THRESHOLDS = { warning: 1, critical: 0.95 };

function interpretation(status: string, severity: string, message: string) {
  return { status, severity, message };
}

function indicators(
  totals: { plannedValue: number; earnedValue: number; actualCost: number },
  budget: number,
) {
  const { plannedValue, earnedValue, actualCost } = totals;
  const cpi = actualCost === 0 ? null : Number((earnedValue / actualCost).toFixed(4));
  const spi = plannedValue === 0 ? null : Number((earnedValue / plannedValue).toFixed(4));
  const eac = cpi === null || cpi === 0 ? null : Number((budget / cpi).toFixed(2));
  return {
    plannedValue,
    earnedValue,
    actualCost,
    costVariance: earnedValue - actualCost,
    scheduleVariance: earnedValue - plannedValue,
    costPerformanceIndex: cpi,
    schedulePerformanceIndex: spi,
    estimateAtCompletion: eac,
    varianceAtCompletion: eac === null ? null : Number((budget - eac).toFixed(2)),
    estimateFormula: 'BAC_OVER_CPI',
    estimates: [],
    costStatus:
      cpi === null
        ? interpretation('NOT_APPLICABLE', 'NOT_APPLICABLE', 'Sin costo real registrado')
        : cpi >= 1
          ? interpretation('UNDER_BUDGET', 'NONE', 'Bajo presupuesto')
          : interpretation(
              'OVER_BUDGET',
              cpi >= THRESHOLDS.critical ? 'WARNING' : 'CRITICAL',
              'Sobre presupuesto: se gasta más de lo que se avanza',
            ),
    scheduleStatus:
      spi === null
        ? interpretation('NOT_APPLICABLE', 'NOT_APPLICABLE', 'Sin valor planificado')
        : spi >= 1
          ? interpretation('ON_SCHEDULE', 'NONE', 'En cronograma')
          : interpretation(
              'BEHIND_SCHEDULE',
              spi >= THRESHOLDS.critical ? 'WARNING' : 'CRITICAL',
              'Atrasado respecto al cronograma',
            ),
    thresholds: THRESHOLDS,
  };
}

function activity(
  id: number,
  projectId: number,
  name: string,
  budget: number,
  planned: number,
  actual: number,
  actualCost: number,
) {
  const totals = {
    plannedValue: (budget * planned) / 100,
    earnedValue: (budget * actual) / 100,
    actualCost,
  };
  return {
    id,
    projectId,
    name,
    budgetAtCompletion: budget,
    plannedProgressPercent: planned,
    actualProgressPercent: actual,
    actualCost,
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-04-30',
    actualStartDate: null,
    actualEndDate: null,
    measurementMethod: 'PERCENT_COMPLETE',
    measurementMethodDescription: 'Porcentaje completado',
    effectivePlannedProgressPercent: planned,
    effectiveActualProgressPercent: actual,
    derivedProgressPercent: null,
    milestones: [],
    indicators: indicators(totals, budget),
  };
}

function project(id: number, name: string, manager: string | null) {
  return {
    id,
    name,
    description: null,
    manager,
    createdAt: '2026-09-03T21:00:00Z',
    updatedAt: '2026-09-03T21:00:00Z',
  };
}

const PROJECTS = [
  project(1, 'Planta Solar Norte', 'Alicia Ramos'),
  project(2, 'Migración core bancario', 'Diego Muñoz'),
];

const ACTIVITIES: Record<number, ReturnType<typeof activity>[]> = {
  1: [
    activity(1, 1, 'Obra civil — cimentación', 500_000, 84, 79.7, 468_000),
    activity(2, 1, 'Montaje de estructuras', 475_000, 80, 76, 352_000),
    activity(3, 1, 'Instalación eléctrica', 325_000, 80, 74, 244_000),
    activity(4, 1, 'Pruebas y puesta en marcha', 400_000, 45, 29, 194_000),
    activity(5, 1, 'Conexión a la red', 300_000, 0, 0, 0),
  ],
  2: [
    activity(6, 2, 'Análisis de brechas', 200_000, 100, 100, 185_000),
    activity(7, 2, 'Migración de datos', 380_000, 70, 72, 262_000),
  ],
};

function sum(list: readonly number[]): number {
  return list.reduce((total, value) => total + value, 0);
}

function summaryOf(id: number) {
  const activities = ACTIVITIES[id] ?? [];
  const budget = sum(activities.map((item) => item.budgetAtCompletion));
  const totals = {
    plannedValue: sum(activities.map((item) => item.indicators.plannedValue)),
    earnedValue: sum(activities.map((item) => item.indicators.earnedValue)),
    actualCost: sum(activities.map((item) => item.indicators.actualCost)),
  };
  return {
    project: PROJECTS.find((item) => item.id === id),
    budgetAtCompletion: budget,
    indicators: indicators(totals, budget),
    activities,
  };
}

function timelineOf(id: number) {
  const summary = summaryOf(id);
  const budget = summary.budgetAtCompletion;
  const cutoffs = ['2026-06-30', '2026-07-31', '2026-08-31'];
  const points = cutoffs.map((cutoffDate, index) => {
    const share = (index + 1) / cutoffs.length;
    const totals = {
      budgetAtCompletion: budget,
      plannedValue: Math.round(summary.indicators.plannedValue * share),
      earnedValue: Math.round(summary.indicators.earnedValue * share),
      actualCost: Math.round(summary.indicators.actualCost * share),
    };
    return { cutoffDate, notes: null, totals, indicators: indicators(totals, budget) };
  });
  return { project: summary.project, points };
}

function listWithIndicators() {
  return PROJECTS.map((item) => {
    const summary = summaryOf(item.id);
    return {
      ...item,
      activityCount: summary.activities.length,
      totals: {
        budgetAtCompletion: summary.budgetAtCompletion,
        plannedValue: summary.indicators.plannedValue,
        earnedValue: summary.indicators.earnedValue,
        actualCost: summary.indicators.actualCost,
      },
      indicators: summary.indicators,
    };
  });
}

/** Responde a todo `/api/v1/**` desde el navegador; el backend no interviene. */
export async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (route.request().method() !== 'GET') {
      return json({ status: 405, detail: 'Solo lectura en las pruebas' }, 405);
    }
    if (path === '/projects') {
      return json(
        url.searchParams.get('includeIndicators') === 'true' ? listWithIndicators() : PROJECTS,
      );
    }
    const evm = /^\/projects\/(\d+)\/evm$/.exec(path);
    if (evm) {
      return json(summaryOf(Number(evm[1])));
    }
    const timeline = /^\/projects\/(\d+)\/timeline$/.exec(path);
    if (timeline) {
      return json(timelineOf(Number(timeline[1])));
    }
    if (/^\/projects\/\d+\/measurements$/.test(path)) {
      return json([]);
    }
    const single = /^\/projects\/(\d+)$/.exec(path);
    if (single) {
      return json(PROJECTS.find((item) => item.id === Number(single[1])) ?? null);
    }
    return json({ status: 404, detail: `Sin simulación para ${path}` }, 404);
  });
}

/** Rutas de las seis vistas, para las comprobaciones que se repiten en todas. */
export const ROUTES = [
  '/panel',
  '/proyectos',
  '/proyectos/1/actividades',
  '/proyectos/1/actividades/1',
  '/ajustes',
  '/perfil',
] as const;
