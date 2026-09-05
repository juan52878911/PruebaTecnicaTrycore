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
 *
 * La consulta se guarda en un campo y no se vuelve a crear. Un `MediaQueryList` del que nadie
 * conserva una referencia puede ser recogido por el recolector de basura junto con su oyente, y
 * entonces la vista deja de reaccionar al redimensionado sin que nada falle de forma visible:
 * quien abre la aplicación en una ventana estrecha y la agranda se queda con el diseño de móvil
 * hasta que recarga. Retenerla evita esa clase de fallo, y de paso el valor inicial y el oyente
 * miran el mismo objeto en lugar de dos equivalentes.
 */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly query = this.createQuery();

  private readonly desktop = signal(this.query?.matches ?? true);

  readonly isDesktop: Signal<boolean> = this.desktop.asReadonly();

  constructor() {
    const query = this.query;
    if (query === null) {
      return;
    }
    const onChange = (event: MediaQueryListEvent): void => this.desktop.set(event.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
  }

  private createQuery(): MediaQueryList | null {
    // jsdom y algunos entornos de prueba no implementan matchMedia.
    if (typeof globalThis.matchMedia !== 'function') {
      return null;
    }
    return globalThis.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`);
  }
}
