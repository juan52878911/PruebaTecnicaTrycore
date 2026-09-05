import { DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Duración del esqueleto al cambiar de vista.
 *
 * Es la del diseño. No mide nada real: es un tiempo fijo que da acuse de recibo inmediato a la
 * pulsación mientras la vista siguiente se monta y pide sus datos. Sin él, una navegación con los
 * datos ya en caché parpadea, y una lenta parece que no ha hecho nada.
 */
const TRANSITION_MS = 460;

/**
 * Marca las transiciones entre vistas para que cada página pueda mostrar su esqueleto.
 *
 * Vive en un servicio y no en cada componente porque la navegación destruye el componente de
 * origen: quien tiene que saber que la transición empezó es el que llega, no el que se va.
 */
@Injectable({ providedIn: 'root' })
export class ViewTransition {
  private readonly router = inject(Router);
  private readonly transitioning = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly isTransitioning: Signal<boolean> = this.transitioning.asReadonly();

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.transitioning.set(true);
          return;
        }
        this.clear();
        this.timer = setTimeout(() => this.transitioning.set(false), TRANSITION_MS);
      });

    inject(DestroyRef).onDestroy(() => this.clear());
  }

  private clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
