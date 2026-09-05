import { DOCUMENT, inject, Injectable } from '@angular/core';

const LOCKED_CLASS = 'scroll-locked';

/**
 * Bloquea el scroll del documento mientras hay una capa modal abierta.
 *
 * Con una hoja inferior abierta solo debe desplazarse la hoja; si el fondo también se mueve, el
 * dedo arrastra dos cosas a la vez y la hoja parece despegarse. Lleva la cuenta de las capas
 * abiertas para que cerrar una no libere el scroll mientras otra sigue en pantalla.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLock {
  private readonly document = inject(DOCUMENT);
  private openLayers = 0;

  lock(): void {
    this.openLayers += 1;
    if (this.openLayers === 1) {
      this.document.body.classList.add(LOCKED_CLASS);
    }
  }

  unlock(): void {
    if (this.openLayers === 0) {
      return;
    }
    this.openLayers -= 1;
    if (this.openLayers === 0) {
      this.document.body.classList.remove(LOCKED_CLASS);
    }
  }
}
