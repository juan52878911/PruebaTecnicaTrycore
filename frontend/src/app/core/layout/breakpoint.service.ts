import { DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';

/** A partir de aquí se considera escritorio y se monta la barra de navegación superior. */
export const DESKTOP_MIN_WIDTH_PX = 768;

/**
 * Ancho de la ventana como signal.
 *
 * La navegación de escritorio y la de móvil se montan con `@if`, nunca las dos a la vez:
 * duplicarlas en el DOM y ocultar una con CSS deja dos regiones de navegación para un lector de
 * pantalla. Escribir el signal desde el oyente de `matchMedia` es lo que repinta la vista sin
 * zone.js.
 */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly desktop = signal(this.matchesDesktop());

  readonly isDesktop: Signal<boolean> = this.desktop.asReadonly();

  constructor() {
    const query = this.desktopQuery();
    if (query === null) {
      return;
    }
    const onChange = (event: MediaQueryListEvent): void => this.desktop.set(event.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }

  private desktopQuery(): MediaQueryList | null {
    // jsdom y algunos entornos de prueba no implementan matchMedia.
    if (typeof globalThis.matchMedia !== 'function') {
      return null;
    }
    return globalThis.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
  }

  private matchesDesktop(): boolean {
    return this.desktopQuery()?.matches ?? true;
  }
}
