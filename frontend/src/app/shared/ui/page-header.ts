import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { BreakpointService } from '../../core/layout/breakpoint.service';

/**
 * Encabezado común a todas las vistas.
 *
 * Existe para que el título ocupe siempre el mismo alto y la misma posición: antes cada página
 * declaraba su propio tamaño de titular y navegar entre ellas desplazaba el contenido de golpe.
 * El segundo término va atenuado, como en el diseño.
 */
const LONG_TITLE = 34;
const MEDIUM_TITLE = 26;

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header [class.mobile]="!isDesktop()">
      @if (isDesktop()) {
        <h1 [style.font-size.px]="titleSize()">
          {{ title() }}
          @if (subtitle()) {
            <span>{{ subtitle() }}</span>
          }
        </h1>
      } @else {
        <div class="stack">
          @if (subtitle()) {
            <span class="kicker">{{ subtitle() }}</span>
          }
          <h1>{{ title() }}</h1>
        </div>
      }
      <div class="actions">
        <ng-content />
      </div>
    </header>
    @if (lead()) {
      <p class="lead">{{ lead() }}</p>
    }
  `,
  styles: `
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
      /* Alto fijo: es lo que evita que el contenido salte al cambiar de vista. */
      min-height: 64px;
      margin-bottom: 8px;
    }
    h1 {
      margin: -0.14em 0 -0.16em;
      min-width: 0;
      flex: 1;
      line-height: 1.3;
      font-weight: 800;
      letter-spacing: -0.035em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    h1 span {
      color: rgba(255, 255, 255, 0.32);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .lead {
      margin: 0 0 22px;
      font-size: 13px;
      color: var(--text-dim);
    }
    header.mobile {
      align-items: flex-start;
      min-height: 0;
      margin-bottom: 16px;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      flex: 1;
    }
    .kicker {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dim);
    }
    header.mobile h1 {
      margin: 0;
      font-size: 22px;
      line-height: 1.15;
      letter-spacing: -0.03em;
      white-space: normal;
    }
    /*
     * Fila propia y ancho acotado: sin el mínimo a cero, el ancho natural de los chips (que no
     * se parten) ensanchaba la cabecera y con ella toda la página, y el móvil alejaba el zoom.
     */
    header.mobile .actions {
      flex: 1 1 100%;
      min-width: 0;
      max-width: 100%;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    header.mobile .actions::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class PageHeader {
  protected readonly isDesktop = inject(BreakpointService).isDesktop;

  readonly title = input.required<string>();
  /** Segundo término, atenuado. */
  readonly subtitle = input<string | null>(null);
  /** Línea de contexto bajo el titular. */
  readonly lead = input<string | null>(null);

  /**
   * Tamaño del titular según su longitud, con la escala del diseño.
   *
   * No es una inconsistencia entre vistas: es un ajuste para que un nombre largo de proyecto quepa
   * en una sola línea en lugar de partirse o recortarse. El alto de la cabecera no cambia.
   */
  protected readonly titleSize = computed(() => {
    const length = `${this.title()} ${this.subtitle() ?? ''}`.trim().length;
    if (length > LONG_TITLE) {
      return 38;
    }
    return length > MEDIUM_TITLE ? 44 : 54;
  });
}
