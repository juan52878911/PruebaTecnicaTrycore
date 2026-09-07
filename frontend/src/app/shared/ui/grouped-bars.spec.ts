import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EvmIndicators } from '../../core/api/models/evm';
import { MeasurementPoint } from '../../core/api/models/measurement';
import { GroupedBars } from './grouped-bars';

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
  estimateFormula: 'BAC_OVER_CPI',
  estimates: [],
  thresholds: { warning: 1, critical: 0.95 },
  costStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: '' },
  scheduleStatus: { status: 'NOT_APPLICABLE', severity: 'NOT_APPLICABLE', message: '' },
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
  imports: [GroupedBars],
  template: `<app-grouped-bars [points]="points()" />`,
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

describe('GroupedBars', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  it('no dibuja ningún grupo sin cortes', () => {
    expect(render([]).querySelectorAll('.group').length).toBe(0);
  });

  it('dibuja un grupo de tres barras por corte', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    expect(element.querySelectorAll('.group').length).toBe(2);
    expect(element.querySelectorAll('.bar').length).toBe(6);
  });

  it('escala las tres series contra un mismo máximo, para que sean comparables', () => {
    const element = render([point('2026-08-31', 1_240_000, 620_000, 1_240_000)]);
    const bars = [...element.querySelectorAll<HTMLElement>('.bar')];

    expect(bars[0]?.style.height).toBe('100%');
    expect(bars[1]?.style.height).toBe('50%');
    expect(bars[2]?.style.height).toBe('100%');
  });

  it('recorta a los ocho cortes más recientes para que las barras sigan siendo legibles', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      point(`2026-${String(index + 1).padStart(2, '0')}-28`, 1000 * (index + 1), 900, 950),
    );

    const element = render(many);

    expect(element.querySelectorAll('.group').length).toBe(8);
    expect(element.querySelector('.tick')?.textContent?.trim()).toBe('28 may');
  });

  it('no divide por cero cuando todos los cortes están a cero', () => {
    const element = render([point('2026-08-31', 0, 0, 0)]);
    const bars = [...element.querySelectorAll<HTMLElement>('.bar')];

    expect(bars.every((bar) => bar.style.height === '0%')).toBe(true);
  });

  it('describe la comparativa para quien no puede verla', () => {
    const element = render([point('2026-08-31', 1_240_000, 1_117_500, 1_258_000)]);

    const label = element.querySelector('.plot')?.getAttribute('aria-label') ?? '';

    expect(label).toContain('31 ago');
    expect(label).toContain('1 240 000');
  });
});
