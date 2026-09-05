import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EvmIndicators } from '../../core/api/models/evm';
import { OverallStatus } from './overall-status';

function indicators(overrides: Partial<EvmIndicators> = {}): EvmIndicators {
  return {
    plannedValue: 1_240_000,
    earnedValue: 1_117_500,
    actualCost: 1_258_000,
    costVariance: -140_500,
    scheduleVariance: -122_500,
    costPerformanceIndex: 0.8883,
    schedulePerformanceIndex: 0.9012,
    estimateAtCompletion: null,
    varianceAtCompletion: null,
    costStatus: { status: 'OVER_BUDGET', message: 'Sobre presupuesto' },
    scheduleStatus: { status: 'BEHIND_SCHEDULE', message: 'Atrasado' },
    ...overrides,
  };
}

@Component({
  imports: [OverallStatus],
  template: `<app-overall-status [indicators]="value()" [cutoffLabel]="cutoff()" />`,
})
class Host {
  readonly value = signal<EvmIndicators>(indicators());
  readonly cutoff = signal<string | null>(null);
}

function render(value: EvmIndicators, cutoff: string | null = null): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.value.set(value);
  fixture.componentInstance.cutoff.set(cutoff);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OverallStatus', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  it('abre con el veredicto del servidor, no con una cifra', () => {
    const element = render(indicators());

    expect(element.querySelector('.verdict')?.textContent?.trim()).toBe('Sobre presupuesto');
  });

  it('explica los dos índices cuando ambos van mal', () => {
    const reading = render(indicators()).querySelector('.reading')?.textContent?.trim();

    expect(reading).toBe(
      'CPI 0,89 y SPI 0,90: el proyecto gasta más y avanza menos de lo planificado.',
    );
  });

  it('distingue el sobrecosto sin atraso', () => {
    const reading = render(
      indicators({
        costPerformanceIndex: 0.9,
        schedulePerformanceIndex: 1.05,
        scheduleStatus: { status: 'AHEAD_OF_SCHEDULE', message: '' },
      }),
    ).querySelector('.reading')?.textContent;

    expect(reading).toContain('gasta más de lo que avanza, aunque el plazo se mantiene');
  });

  it('distingue el atraso sin sobrecosto', () => {
    const reading = render(
      indicators({
        costPerformanceIndex: 1.05,
        costStatus: { status: 'UNDER_BUDGET', message: '' },
      }),
    ).querySelector('.reading')?.textContent;

    expect(reading).toContain('el costo se mantiene, pero el avance va por debajo del plan');
  });

  it('reconoce el proyecto que va bien', () => {
    const reading = render(
      indicators({
        costPerformanceIndex: 1.05,
        schedulePerformanceIndex: 1.02,
        costStatus: { status: 'UNDER_BUDGET', message: '' },
        scheduleStatus: { status: 'AHEAD_OF_SCHEDULE', message: '' },
      }),
    ).querySelector('.reading')?.textContent;

    expect(reading).toContain('dentro de presupuesto y al día');
  });

  it('no interpreta nada cuando no hay ningún índice definido', () => {
    const reading = render(
      indicators({
        costPerformanceIndex: null,
        schedulePerformanceIndex: null,
        costStatus: { status: 'NOT_APPLICABLE', message: '' },
        scheduleStatus: { status: 'NOT_APPLICABLE', message: '' },
      }),
    ).querySelector('.reading')?.textContent;

    expect(reading).toContain('todavía no hay indicadores que interpretar');
  });

  it('menciona solo el índice que existe si el otro es nulo', () => {
    const reading = render(
      indicators({
        costPerformanceIndex: null,
        costStatus: { status: 'NOT_APPLICABLE', message: '' },
      }),
    ).querySelector('.reading')?.textContent;

    expect(reading).toContain('SPI 0,90');
    expect(reading).not.toContain('CPI');
  });

  it('muestra la fecha del corte cuando se le pasa', () => {
    const element = render(indicators(), '31 ago 2026');

    expect(element.querySelector('.cutoff')?.textContent?.trim()).toBe('31 ago 2026');
  });

  it('omite el distintivo de fecha si el proyecto no tiene cortes', () => {
    expect(render(indicators()).querySelector('.cutoff')).toBeNull();
  });
});
