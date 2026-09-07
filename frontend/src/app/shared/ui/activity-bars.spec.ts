import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Activity } from '../../core/api/models/activity';
import { EvmIndicators } from '../../core/api/models/evm';
import { ActivityBars } from './activity-bars';

const BASE_INDICATORS: EvmIndicators = {
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
  costStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: '' },
  scheduleStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: '' },
};

function activity(id: number, name: string, pv: number, ev: number, ac: number): Activity {
  return {
    id,
    projectId: 1,
    name,
    budgetAtCompletion: 500_000,
    plannedProgressPercent: 0,
    actualProgressPercent: 0,
    actualCost: ac,
    plannedStartDate: null,
    plannedEndDate: null,
    actualStartDate: null,
    actualEndDate: null,
    measurementMethod: 'PERCENT_COMPLETE',
    measurementMethodDescription: 'Porcentaje completado',
    effectivePlannedProgressPercent: 0,
    effectiveActualProgressPercent: 0,
    derivedProgressPercent: null,
    milestones: [],
    indicators: { ...BASE_INDICATORS, plannedValue: pv, earnedValue: ev, actualCost: ac },
  };
}

@Component({
  imports: [ActivityBars],
  template: `<app-activity-bars [activities]="activities()" />`,
})
class Host {
  readonly activities = signal<readonly Activity[]>([]);
}

function render(activities: readonly Activity[]): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.activities.set(activities);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ActivityBars', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  it('no dibuja ningún grupo sin actividades', () => {
    expect(render([]).querySelectorAll('.group').length).toBe(0);
  });

  it('dibuja un grupo de tres barras por actividad, con su nombre debajo', () => {
    const element = render([
      activity(1, 'Diseño', 100_000, 90_000, 95_000),
      activity(2, 'Desarrollo', 300_000, 240_000, 260_000),
      activity(3, 'Pruebas', 50_000, 0, 0),
    ]);

    expect(element.querySelectorAll('.group').length).toBe(3);
    expect(element.querySelectorAll('.bar').length).toBe(9);
    const ticks = [...element.querySelectorAll('.tick')].map((tick) => tick.textContent?.trim());
    expect(ticks).toEqual(['Diseño', 'Desarrollo', 'Pruebas']);
  });

  it('escala todas las actividades contra el valor más alto del proyecto', () => {
    const element = render([
      activity(1, 'Diseño', 100_000, 50_000, 25_000),
      activity(2, 'Desarrollo', 200_000, 100_000, 400_000),
    ]);
    const heights = [...element.querySelectorAll<HTMLElement>('.bar')].map(
      (bar) => bar.style.height,
    );

    expect(heights).toEqual(['25%', '12.5%', '6.25%', '50%', '25%', '100%']);
  });

  it('no divide por cero cuando ninguna actividad tiene cifras', () => {
    const element = render([activity(1, 'Sin arrancar', 0, 0, 0)]);
    const bars = [...element.querySelectorAll<HTMLElement>('.bar')];

    expect(bars.every((bar) => bar.style.height === '0%')).toBe(true);
  });

  it('muestra todas las actividades en lugar de recortar las últimas', () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      activity(index + 1, `Actividad ${index + 1}`, 1000, 900, 950),
    );

    expect(render(many).querySelectorAll('.group').length).toBe(15);
  });

  it('describe la comparativa para quien no puede verla', () => {
    const element = render([activity(1, 'Desarrollo', 300_000, 240_000, 260_000)]);

    const label = element.querySelector('.plot')?.getAttribute('aria-label') ?? '';

    expect(label).toContain('Desarrollo');
    expect(label).toContain('300 000');
    expect(label).toContain('260 000');
  });
});
