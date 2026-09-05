import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { BreakpointService } from '../../core/layout/breakpoint.service';

/**
 * Encabezado común a todas las vistas.
 *
 * En escritorio el título ocupa siempre el mismo alto y la misma posición: antes cada página
 * declaraba su propio tamaño de titular y navegar entre ellas desplazaba el contenido de golpe. El
 * segundo término va atenuado, como en el diseño, y los controles proyectados (chips, selector)
 * van a la derecha.
 *
 * En móvil sigue el artboard del diseño: un rótulo pequeño, el título a 22 px que, cuando la vista
 * lo permite, es el propio selector de proyecto (con su chevron), y el avatar a la derecha, que
 * lleva al perfil. Los chips de escritorio no se muestran; lo único que se conserva del contenido
 * proyectado es el selector, que en móvil se abre como hoja inferior.
 */
const LONG_TITLE = 34;
const MEDIUM_TITLE = 26;

@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
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
          @if (kicker()) {
            <span class="kicker">{{ kicker() }}</span>
          }
          @if (pickable()) {
            <button
              type="button"
              class="title-button"
              aria-label="Cambiar de proyecto"
              aria-haspopup="listbox"
              (click)="pick.emit()"
            >
              <h1>{{ mobileHeading() }}</h1>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
              </svg>
            </button>
          } @else {
            <h1>{{ mobileHeading() }}</h1>
          }
        </div>
        <a class="avatar" routerLink="/perfil" routerLinkActive="active" aria-label="Perfil">AR</a>
      }
      <!--
        Un único punto de proyección: con dos, Angular solo vuelca el contenido en el último. En
        móvil no se pinta: los chips de filtro y las acciones de escritorio no existen en el
        artboard, y el selector de proyecto lo abre cada página como hoja fuera de la cabecera.
      -->
      <div class="actions" [class.hidden]="!isDesktop()">
        <ng-content />
      </div>
    </header>
    @if (lead() && isDesktop()) {
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

    /* Móvil */
    header.mobile {
      flex-wrap: nowrap;
      align-items: center;
      gap: 12px;
      min-height: 0;
      margin-bottom: 20px;
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
      min-width: 0;
      font-size: 22px;
      line-height: 1.15;
      letter-spacing: -0.03em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .title-button {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      max-width: 100%;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      text-align: left;
    }
    .title-button svg {
      flex: none;
      width: 20px;
      height: 20px;
      fill: rgba(255, 255, 255, 0.7);
    }
    .avatar {
      flex: none;
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--avatar);
      color: #c9aeff;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: box-shadow var(--motion-veil);
    }
    .avatar.active {
      box-shadow: 0 0 0 2px var(--accent);
    }
    .actions.hidden {
      display: none;
    }
  `,
})
export class PageHeader {
  protected readonly isDesktop = inject(BreakpointService).isDesktop;

  readonly title = input.required<string>();
  /** Segundo término del titular de escritorio, atenuado. */
  readonly subtitle = input<string | null>(null);
  /** Línea de contexto bajo el titular, solo en escritorio. */
  readonly lead = input<string | null>(null);
  /** Rótulo pequeño sobre el título en móvil. Si falta, se usa el segundo término. */
  readonly mobileKicker = input<string | null>(null);
  /** Título en móvil. Si falta, se usa el título de escritorio. */
  readonly mobileTitle = input<string | null>(null);
  /** El título móvil es el selector de proyecto: muestra el chevron y emite `pick` al pulsar. */
  readonly pickable = input(false, { transform: booleanAttribute });
  readonly pick = output<void>();

  protected readonly kicker = computed(() => this.mobileKicker() ?? this.subtitle());
  protected readonly mobileHeading = computed(() => this.mobileTitle() ?? this.title());

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
