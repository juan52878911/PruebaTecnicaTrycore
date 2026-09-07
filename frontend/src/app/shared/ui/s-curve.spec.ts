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

    // El trazo se suaviza con curvas: un arranque y un tramo por cada corte posterior.
    const first = element.querySelector('path[stroke]');
    const path = first?.getAttribute('d') ?? '';

    expect(path.match(/M/g)).toHaveLength(1);
    expect(path.match(/C/g)).toHaveLength(2);
  });

  it('hace pasar la curva exactamente por cada corte, sin desplazar el dato', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);
    const paths = [...element.querySelectorAll('path[stroke]')].map(
      (node) => node.getAttribute('d') ?? '',
    );

    // Toda serie termina en la x del último corte, no en un punto de control intermedio.
    for (const path of paths) {
      expect(path).toMatch(/ 600 [\d.]+$/);
    }
  });

  it('centra el único punto cuando solo hay un corte, en vez de pegarlo al borde', () => {
    const element = render([point('2026-08-31', 1_240_000, 1_117_500, 1_258_000)]);

    const path = element.querySelector('path[stroke]')?.getAttribute('d') ?? '';

    expect(path.startsWith('M300 ')).toBe(true);
  });

  it('deja margen sobre el máximo, para que el área no cubra la tarjeta entera', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);
    const paths = [...element.querySelectorAll('path[stroke]')].map(
      (node) => node.getAttribute('d') ?? '',
    );

    // La serie más alta (AC) no llega al borde superior útil del lienzo, que está en y = 12.
    const highestY = Number(paths.at(-1)?.split(' ').at(-1));
    expect(highestY).toBeGreaterThan(12);
    // Pero sigue ocupando la mayor parte del alto: el margen es holgura, no aplastamiento.
    expect(highestY).toBeLessThan(60);
  });

  it('etiqueta el eje con el mes de cada corte, como el diseño', () => {
    const element = render([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);

    const labels = [...element.querySelectorAll('.axis span')].map((node) => node.textContent);

    expect(labels).toEqual(['Jul', 'Ago']);
  });

  it('no muestra ningún globo hasta que el puntero entra en la gráfica', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.points.set([
      point('2026-07-31', 990_000, 920_000, 984_000),
      point('2026-08-31', 1_240_000, 1_117_500, 1_258_000),
    ]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.tooltip')).toBeNull();

    // Al entrar en la zona del segundo corte aparece su ficha.
    const zones = element.querySelectorAll('rect[fill="transparent"]');
    zones[1]?.dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    const tooltip = element.querySelector('.tooltip');
    expect(tooltip?.querySelector('.tip-label')?.textContent).toContain('AGO');
    expect(tooltip?.querySelector('.tip-value')?.textContent?.trim()).toBe('1,12 M');

    // Y desaparece al salir del lienzo.
    element.querySelector('svg')?.dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(element.querySelector('.tooltip')).toBeNull();
  });

  it('no repite el mes cuando varios cortes caen en el mismo', () => {
    const element = render([
      point('2026-08-15', 900_000, 850_000, 900_000),
      point('2026-08-31', 990_000, 920_000, 984_000),
      point('2026-09-05', 1_240_000, 1_117_500, 1_258_000),
    ]);

    const labels = [...element.querySelectorAll('.axis span')].map((node) => node.textContent);

    expect(labels).toEqual(['Ago', '', 'Sep']);
  });

  it('encabeza la tarjeta con el valor ganado acumulado', () => {
    const element = render([point('2026-08-31', 1_240_000, 1_117_500, 1_258_000)]);

    expect(element.querySelector('.total')?.textContent?.trim()).toBe('1,12 M');
    expect(element.querySelector('.caption')?.textContent).toContain('acumulado');
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
