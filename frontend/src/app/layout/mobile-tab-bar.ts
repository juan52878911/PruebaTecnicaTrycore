import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { SelectedProjectStore } from '../core/selection/selected-project-store';
import { NAV_ITEMS } from './navigation';

/** Barra inferior de móvil, con el perfil como último destino. */
@Component({
  selector: 'app-mobile-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav aria-label="Navegación principal">
      @for (item of items; track item.path; let index = $index) {
        <a
          [routerLink]="item.path"
          [class.active]="index === activeIndex()"
          [attr.aria-current]="index === activeIndex() ? 'page' : null"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </a>
        <!-- El botón de alta va en el centro de la barra, dentro de ella, como en el diseño. -->
        @if (index === centerIndex) {
          <button type="button" class="fab" (click)="newActivity()" aria-label="Nueva actividad">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        }
      }
    </nav>
  `,
  styles: `
    /*
     * En flujo, al pie del marco de altura fija: el contenido se desplaza dentro de <main> y la
     * barra no se mueve nunca, tampoco cuando el navegador muestra u oculta su propia barra.
     */
    :host {
      display: block;
      flex: none;
      padding: 12px 0 calc(10px + env(safe-area-inset-bottom, 0px));
    }
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 10px;
      background: rgba(16, 16, 18, 0.94);
      backdrop-filter: blur(18px);
      border: 1px solid var(--border-control);
      border-radius: 26px;
      box-shadow: var(--shadow-float);
    }
    a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 0;
      padding: 9px 9px;
      border-radius: 16px;
      text-decoration: none;
      color: var(--text-dim);
      font-size: 10px;
      font-weight: 600;
      transition: background var(--motion-veil);
    }
    a.active {
      background: rgba(139, 111, 224, 0.14);
      color: var(--accent-text);
    }
    a.active span {
      color: var(--text);
    }
    a svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }
    .fab {
      flex: none;
      display: grid;
      place-items: center;
      width: 54px;
      height: 54px;
      margin: 0 4px;
      border: none;
      border-radius: 50%;
      background: #fff;
      transition: background var(--motion-veil);
    }
    .fab:hover {
      background: rgba(255, 255, 255, 0.88);
    }
    .fab svg {
      width: 27px;
      height: 27px;
      fill: var(--screen);
    }
  `,
})
export class MobileTabBar {
  private readonly selection = inject(SelectedProjectStore);
  private readonly router = inject(Router);

  protected readonly items = NAV_ITEMS;
  /** El botón de alta se inserta tras la segunda pestaña, como en el diseño. */
  protected readonly centerIndex = 1;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Misma regla que en escritorio: la ruta de actividad empieza por /proyectos. */
  protected readonly activeIndex = computed(() => {
    const url = this.url().split('?')[0] ?? '';
    if (url.includes('/actividades')) {
      return this.items.findIndex((item) => item.path === '/actividades');
    }
    if (url.startsWith('/proyectos')) {
      return this.items.findIndex((item) => item.path === '/proyectos');
    }
    if (url.startsWith('/ajustes')) {
      return this.items.findIndex((item) => item.path === '/ajustes');
    }
    if (url.startsWith('/panel')) {
      return this.items.findIndex((item) => item.path === '/panel');
    }
    return -1;
  });

  /**
   * Abre el alta en el proyecto de la vista actual si la URL lo lleva, y si no en el seleccionado.
   * Leer primero la URL evita una carrera al entrar en Actividades: la selección se actualiza en
   * el primer ciclo de la vista y una pulsación muy temprana la encontraría vacía.
   */
  protected newActivity(): void {
    const fromUrl = /\/proyectos\/(\d+)/.exec(this.url())?.[1];
    const projectId = fromUrl === undefined ? this.selection.projectId() : Number(fromUrl);
    if (projectId === undefined) {
      void this.router.navigate(['/proyectos']);
      return;
    }
    void this.router.navigate(['/proyectos', projectId, 'actividades'], {
      queryParams: { nueva: 1 },
    });
  }
}
