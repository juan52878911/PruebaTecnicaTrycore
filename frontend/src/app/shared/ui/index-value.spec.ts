import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UndefinedIndicator } from '../../core/api/models/evm';
import { Tone } from '../../core/status/status-tone';
import { IndexValue } from './index-value';

@Component({
  imports: [IndexValue],
  template: `<app-index-value [value]="value()" [tone]="tone()" />`,
})
class Host {
  readonly value = signal<UndefinedIndicator>(null);
  readonly tone = signal<Tone>('neutral');
}

function render(value: UndefinedIndicator, tone: Tone = 'neutral'): HTMLElement {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.value.set(value);
  fixture.componentInstance.tone.set(tone);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('IndexValue', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host] }));

  it('rotula el indicador indefinido como N/A, no como cero', () => {
    expect(render(null).textContent?.trim()).toBe('N/A');
  });

  it('pinta un índice de cero como cero, porque ese índice sí existe', () => {
    expect(render(0).textContent?.trim()).toBe('0,00');
  });

  it('usa coma decimal', () => {
    expect(render(0.8883).textContent?.trim()).toBe('0,89');
  });

  it('aplica la clase del tono que recibe', () => {
    const element = render(0.6, 'danger');

    expect(element.querySelector('.tone-danger')).not.toBeNull();
  });
});
