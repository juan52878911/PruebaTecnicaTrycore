import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { SelectedProjectStore } from '../core/selection/selected-project-store';
import { NAV_ITEMS } from './navigation';

/** Barra de navegación de escritorio: píldora con la pestaña activa en blanco. */
@Component({
  selector: 'app-top-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navegación principal">
      <ul class="pill">
        @for (item of items; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              #link="routerLinkActive"
              [attr.aria-current]="link.isActive ? 'page' : null"
            >
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
      <a class="profile" routerLink="/perfil" routerLinkActive="active">
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
    .pill a {
      display: block;
      padding: 11px 20px;
      border-radius: var(--radius-pill);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
      transition:
        background var(--motion-veil),
        color var(--motion-veil);
    }
    .pill a:hover {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }
    .pill a.active {
      background: #fff;
      color: var(--screen);
      padding: 11px 22px;
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
