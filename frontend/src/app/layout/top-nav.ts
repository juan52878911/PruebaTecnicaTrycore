import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { SelectedProjectStore } from '../core/selection/selected-project-store';
import { NAV_ITEMS } from './navigation';

interface Indicator {
  readonly left: number;
  readonly width: number;
  readonly visible: boolean;
}

const HIDDEN: Indicator = { left: 0, width: 0, visible: false };

/**
 * Barra de navegación de escritorio.
 *
 * La pastilla blanca es un único elemento que se desplaza y se estira hasta la pestaña activa, en
 * lugar de un fondo por pestaña que aparece y desaparece. Se mide del DOM porque el ancho depende
 * del texto, que cambia con el idioma de los rótulos.
 */
@Component({
  selector: 'app-top-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav aria-label="Navegación principal">
      <ul class="pill">
        <li
          class="marker"
          aria-hidden="true"
          [style.left.px]="indicator().left"
          [style.width.px]="indicator().width"
          [style.opacity]="indicator().visible ? 1 : 0"
        ></li>
        @for (item of items; track item.path; let index = $index) {
          <li>
            <a
              #tab
              [routerLink]="item.path"
              [class.active]="index === activeIndex()"
              [attr.aria-current]="index === activeIndex() ? 'page' : null"
            >
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
      <a class="profile" routerLink="/perfil" [class.active]="isProfile()">
        <span class="avatar" aria-hidden="true">AR</span>
        <span class="identity">
          <span class="role">Administradora</span>
          <span class="name">Alicia Ramos</span>
        </span>
      </a>
      <button type="button" class="add" (click)="newActivity()" aria-label="Nueva actividad">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </nav>
  `,
  styles: `
    nav {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: var(--gap-section);
    }
    .pill {
      position: relative;
      display: flex;
      align-items: center;
      gap: 4px;
      list-style: none;
      margin: 0 auto 0 0;
      padding: 6px;
      background: var(--control);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
    }
    .marker {
      position: absolute;
      top: 6px;
      bottom: 6px;
      border-radius: var(--radius-pill);
      background: #fff;
      transition:
        left 320ms cubic-bezier(0.4, 0, 0.2, 1),
        width 320ms cubic-bezier(0.4, 0, 0.2, 1),
        opacity 260ms ease;
    }
    .pill a {
      position: relative;
      display: block;
      padding: 11px 22px;
      border-radius: var(--radius-pill);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      white-space: nowrap;
      transition: color 260ms ease;
    }
    /* El velo del hover se queda por debajo de la pastilla, nunca sobre ella. */
    .pill a:hover:not(.active) {
      color: var(--text);
    }
    .pill a.active {
      color: var(--screen);
    }
    @media (prefers-reduced-motion: reduce) {
      .marker {
        transition: none;
      }
    }
    .profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px 6px 6px;
      background: var(--control);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
      text-decoration: none;
      color: inherit;
    }
    .profile.active {
      background: var(--control-hover);
      border-color: rgba(139, 111, 224, 0.45);
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--avatar);
      color: #c9aeff;
      font-size: 12px;
      font-weight: 700;
    }
    .identity {
      display: flex;
      flex-direction: column;
    }
    .role {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-dim);
    }
    .name {
      font-size: 13px;
      font-weight: 700;
    }
    .add {
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      flex: none;
      border: 1px solid var(--border-control);
      border-radius: 50%;
      background: var(--control);
      transition: background var(--motion-veil);
    }
    .add:hover {
      background: var(--control-hover);
    }
    .add svg {
      width: 22px;
      height: 22px;
      fill: rgba(255, 255, 255, 0.7);
    }
  `,
})
export class TopNav {
  private readonly selection = inject(SelectedProjectStore);
  private readonly router = inject(Router);

  protected readonly items = NAV_ITEMS;

  private readonly tabs = viewChildren<ElementRef<HTMLElement>>('tab');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Pestaña activa.
   *
   * No se puede delegar en `routerLinkActive`: la ruta de una actividad es
   * `/proyectos/:id/actividades`, que empieza por `/proyectos`, así que el enlace de Proyectos
   * casaría por prefijo y se encenderían dos pestañas a la vez.
   */
  protected readonly activeIndex = computed(() => {
    const url = this.url().split('?')[0] ?? '';
    if (url.includes('/actividades')) {
      return this.indexOf('/actividades');
    }
    if (url.startsWith('/proyectos')) {
      return this.indexOf('/proyectos');
    }
    if (url.startsWith('/ajustes')) {
      return this.indexOf('/ajustes');
    }
    if (url.startsWith('/panel')) {
      return this.indexOf('/panel');
    }
    return -1;
  });

  protected readonly isProfile = computed(() => this.url().startsWith('/perfil'));

  private readonly measured = signal<Indicator>(HIDDEN);
  protected readonly indicator = this.measured.asReadonly();

  constructor() {
    effect(() => {
      const index = this.activeIndex();
      const elements = this.tabs();
      const target = index < 0 ? undefined : elements[index];
      if (target === undefined) {
        this.measured.set(HIDDEN);
        return;
      }
      const element = target.nativeElement;
      this.measured.set({
        left: element.offsetLeft,
        width: element.offsetWidth,
        visible: true,
      });
    });
  }

  private indexOf(path: string): number {
    return this.items.findIndex((item) => item.path === path);
  }

  /**
   * Abre el alta de actividad del proyecto activo.
   *
   * El estado del diálogo viaja en la URL en lugar de en un servicio compartido: así el botón
   * funciona desde cualquier vista y el formulario abierto se puede enlazar.
   */
  protected newActivity(): void {
    const projectId = this.selection.projectId();
    if (projectId === undefined) {
      void this.router.navigate(['/proyectos']);
      return;
    }
    void this.router.navigate(['/proyectos', projectId, 'actividades'], {
      queryParams: { nueva: 1 },
    });
  }
}
