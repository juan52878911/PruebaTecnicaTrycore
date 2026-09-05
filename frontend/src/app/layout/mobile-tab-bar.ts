import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from './navigation';

/** Barra inferior de móvil, con el perfil como último destino. */
@Component({
  selector: 'app-mobile-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Navegación principal">
      @for (item of items; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          #link="routerLinkActive"
          [attr.aria-current]="link.isActive ? 'page' : null"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </a>
      }
      <a routerLink="/perfil" routerLinkActive="active" #profile="routerLinkActive">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <span>Perfil</span>
      </a>
    </nav>
  `,
  styles: `
    nav {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin-top: auto;
      padding: 10px;
      background: var(--nav-mobile);
      border: 1px solid var(--border-control);
      border-radius: 26px;
    }
    a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-height: 44px;
      padding: 9px 0;
      border-radius: var(--radius-tile);
      text-decoration: none;
      color: var(--text-dim);
      font-size: 10px;
      font-weight: 600;
    }
    a.active {
      background: var(--accent-soft);
      color: var(--text);
      font-weight: 700;
    }
    svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }
  `,
})
export class MobileTabBar {
  protected readonly items = NAV_ITEMS;
}
