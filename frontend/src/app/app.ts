import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BreakpointService } from './core/layout/breakpoint.service';
import { MobileTabBar } from './layout/mobile-tab-bar';
import { TopNav } from './layout/top-nav';
import { ToastHost } from './shared/ui/toast-host';

/**
 * Marco de la aplicación.
 *
 * La navegación de escritorio y la de móvil se montan con `@if`, nunca las dos a la vez. Tenerlas
 * siempre en el DOM y ocultar una con CSS dejaría dos regiones de navegación para un lector de
 * pantalla, que es exactamente el tipo de fallo que la regla de accesibilidad del lint persigue.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TopNav, MobileTabBar, ToastHost],
  template: `
    <div class="shell">
      @if (isDesktop()) {
        <app-top-nav />
      }
      <main>
        <router-outlet />
      </main>
      @if (!isDesktop()) {
        <app-mobile-tab-bar />
      }
    </div>
    <app-toast-host />
  `,
  styles: `
    .shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      max-width: 1360px;
      margin: 0 auto;
      padding: 22px 28px 32px;
    }
    main {
      flex: 1;
    }
    /*
     * Móvil, con la estructura del artboard: el marco mide lo que la pantalla, solo se desplaza el
     * contenido y la barra inferior queda en su sitio. Una barra "fixed" se mueve cuando el
     * navegador muestra u oculta su propia barra; en un flujo de altura fija, no.
     */
    @media (max-width: 767px) {
      .shell {
        height: 100vh;
        height: 100dvh;
        padding: 14px 20px 0;
        overflow: hidden;
      }
      main {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-bottom: 20px;
        /* Sin barra visible: en el móvil real es superpuesta y el artboard no la dibuja. */
        scrollbar-width: none;
      }
      main::-webkit-scrollbar {
        display: none;
      }
    }
  `,
})
export class App {
  private readonly breakpoint = inject(BreakpointService);

  protected readonly isDesktop = this.breakpoint.isDesktop;
}
