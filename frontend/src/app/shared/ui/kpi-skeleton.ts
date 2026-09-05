import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Skeleton } from './skeleton';

/** Variantes de esqueleto, una por tipo de tarjeta del panel. */
export type SkeletonShape = 'kpi' | 'index' | 'chart';

/**
 * Esqueleto que imita la tarjeta real, no un bloque genérico.
 *
 * La gracia de un esqueleto es que el contenido no dé un salto al llegar: si el hueco tiene la
 * forma y la altura de lo que va a ocupar, la carga se percibe como más corta aunque dure lo
 * mismo. Por eso hay una variante por tipo de tarjeta, con sus proporciones.
 */
@Component({
  selector: 'app-kpi-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Skeleton],
  template: `
    <div class="card" [class]="shape()" aria-hidden="true">
      @switch (shape()) {
        @case ('kpi') {
          <!-- Rótulo, cifra grande, y el pie de contexto. -->
          <app-skeleton width="30%" [height]="13" />
          <app-skeleton width="62%" [height]="40" />
          <app-skeleton width="44%" [height]="11" />
        }
        @case ('index') {
          <!-- Rótulo, índice, barra de progreso y la línea de interpretación. -->
          <app-skeleton width="26%" [height]="13" />
          <app-skeleton width="34%" [height]="48" />
          <app-skeleton width="100%" [height]="6" />
          <app-skeleton width="82%" [height]="12" />
        }
        @case ('chart') {
          <!-- Título, cifra acumulada y el lienzo de la curva. -->
          <app-skeleton width="34%" [height]="13" />
          <app-skeleton width="40%" [height]="38" />
          <app-skeleton width="100%" [height]="200" />
        }
      }
    </div>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: var(--pad-card);
    }
    .kpi {
      gap: 16px;
    }
  `,
})
export class KpiSkeleton {
  readonly shape = input.required<SkeletonShape>();
}
