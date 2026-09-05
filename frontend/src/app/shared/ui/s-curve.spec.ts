import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EvmIndicators } from '../../core/api/models/evm';
import { MeasurementPoint } from '../../core/api/models/measurement';
import { SCurve } from './s-curve';

const INDICATORS: EvmIndicators = {
  plannedValue: 0,
  earnedValue: 0,
  actualCost: 0,
  costVariance: 0,
  scheduleVariance: 0,
  costPerformanceIndex: null,
  schedulePerformanceIndex: null,
  estimateAtCompletion: null,
  varianceAtCompletion: null,
  costStatus: { status: 'NOT_APPLICABLE', message: '' },
  scheduleStatus: { status: 'NOT_APPLICABLE', message: '' },
};

function point(cutoffDate: string, pv: number, ev: number, ac: number): MeasurementPoint {
  return {
    cutoffDate,
    notes: null,
    totals: { budgetAtCompletion: 1_700_000, plannedValue: pv, earnedValue: ev, actualCost: ac },
    indicators: INDICATORS,
  };
}

@Component({
  imports: [SCurve],
  template: `<app-s-curve [points]="points()" />`,
})
class Host {
  readonly points = signal<readonly MeasurementPoint[]>([]);
}

function render(points: readonly MeasurementPoint[]): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.points.set(points);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SCurve', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  it('no dibuja ninguna serie sin cortes', () => {
    const element = render([]);

    expect(element.querySelectorAll('path[stroke]').length).toBe(0);
  });

  it('dibuja las tres series cuando hay datos', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    const lines = element.querySelectorAll('path[stroke]');
    expect(lines.length).toBe(3);
  });

  it('genera una coordenada por corte en cada serie', () => {
    const element = render([
      point('2026-06-30', 850_000, 790_000, 850_000),
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    const first = element.querySelector('path[stroke]');
    const commands = first?.getAttribute('d')?.match(/[ML]/g) ?? [];

    expect(commands).toHaveLength(3);
  });

  it('centra el único punto cuando solo hay un corte, en vez de pegarlo al borde', () => {
    const element = render([point('2026-08-31', 1_240_000, 1_117_500, 1_258_000)]);

    const path = element.querySelector('path[stroke]')?.getAttribute('d') ?? '';

    expect(path.startsWith('M300 ')).toBe(true);
  });

  it('etiqueta el eje con las fechas de corte abreviadas', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    const labels = [...element.querySelectorAll('.axis span')].map((node) => node.textContent);

    expect(labels).toEqual(['31 jul', '31 ago']);
  });

  it('describe la gráfica para quien no puede verla', () => {
    const element = render([point('2026-08-31', 1_240_000, 1_117_500, 1_258_000)]);

    const label = element.querySelector('svg')?.getAttribute('aria-label') ?? '';

    expect(label).toContain('1 corte.');
    expect(label).toContain('1,12 M');
  });

  it('concuerda el plural con el número de cortes', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    expect(element.querySelector('svg')?.getAttribute('aria-label')).toContain('2 cortes.');
  });
});
