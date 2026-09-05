import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Encabezado común a todas las vistas.
 *
 * Existe para que el título ocupe siempre el mismo alto y la misma posición: antes cada página
 * declaraba su propio tamaño de titular y navegar entre ellas desplazaba el contenido de golpe.
 * El segundo término va atenuado, como en el diseño.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <h1>
        {{ title() }}
        @if (subtitle()) {
          <span>{{ subtitle() }}</span>
        }
      </h1>
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
      margin: 0;
      font-size: 48px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.04em;
      overflow-wrap: anywhere;
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
    @media (max-width: 900px) {
      h1 {
        font-size: 32px;
      }
      header {
        min-height: 0;
      }
    }
    @media (max-width: 767px) {
      h1 {
        font-size: 24px;
      }
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  /** Segundo término, atenuado. */
  readonly subtitle = input<string | null>(null);
  /** Línea de contexto bajo el titular. */
  readonly lead = input<string | null>(null);
}
