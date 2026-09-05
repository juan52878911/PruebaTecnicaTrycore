import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ViewTransition } from './view-transition';

/** Componente mínimo para tener a dónde navegar. */
import { Component } from '@angular/core';

@Component({ template: '' })
class Blank {}

describe('ViewTransition', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'uno', component: Blank },
          { path: 'dos', component: Blank },
        ]),
      ],
    });
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  async function navigate(path: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(path);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('no marca transición antes de navegar', () => {
    expect(TestBed.inject(ViewTransition).isTransitioning()).toBe(false);
  });

  it('marca la transición al navegar y la mantiene un instante tras llegar', async () => {
    const transition = TestBed.inject(ViewTransition);

    await navigate('/uno');

    expect(transition.isTransitioning()).toBe(true);
  });

  it('la levanta pasada la duración del diseño', async () => {
    const transition = TestBed.inject(ViewTransition);
    await navigate('/uno');

    vi.advanceTimersByTime(460);

    expect(transition.isTransitioning()).toBe(false);
  });

  it('sigue en transición justo antes de cumplirse el plazo', async () => {
    const transition = TestBed.inject(ViewTransition);
    await navigate('/uno');

    vi.advanceTimersByTime(400);

    expect(transition.isTransitioning()).toBe(true);
  });

  it('una segunda navegación reinicia el plazo en lugar de acortarlo', async () => {
    const transition = TestBed.inject(ViewTransition);
    await navigate('/uno');
    vi.advanceTimersByTime(400);

    await navigate('/dos');
    vi.advanceTimersByTime(400);

    expect(transition.isTransitioning()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(transition.isTransitioning()).toBe(false);
  });
});
