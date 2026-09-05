import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { BreakpointService } from '../../core/layout/breakpoint.service';

/**
 * Diálogo modal en escritorio y hoja inferior en móvil.
 *
 * Es un solo componente y no dos porque el contenido es idéntico: lo único que cambia es de dónde
 * entra y cómo se ancla. El velo cierra al pulsarlo y la tecla de escape también, que es lo que
 * cualquiera espera de un diálogo.
 */
@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismiss.emit()' },
  template: `
    <div class="veil" (click)="dismiss.emit()" aria-hidden="true"></div>
    <div
      class="panel"
      [class.sheet]="!isDesktop()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
    >
      @if (!isDesktop()) {
        <span class="grabber" aria-hidden="true"></span>
      }
      <header>
        <div>
          <h2>{{ title() }}</h2>
          @if (subtitle()) {
            <p class="subtitle">{{ subtitle() }}</p>
          }
        </div>
        <button type="button" class="close" (click)="dismiss.emit()" aria-label="Cerrar">
          &times;
        </button>
      </header>
      <div class="body">
        <ng-content />
      </div>
      <footer>
        <ng-content select="[dialogActions]" />
      </footer>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .veil {
      position: absolute;
      inset: 0;
      background: rgba(4, 4, 5, 0.72);
      backdrop-filter: blur(3px);
    }
    .panel {
      position: relative;
      width: min(460px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 24px;
      padding: 26px 28px;
      box-shadow: var(--shadow-modal);
      animation: vPop 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    :host:has(.sheet) {
      align-items: flex-end;
    }
    .panel.sheet {
      width: 100%;
      max-width: none;
      max-height: calc(100dvh - 48px);
      border-radius: 28px 28px 0 0;
      padding: 10px 20px calc(22px + env(safe-area-inset-bottom, 0px));
      animation: vSheet 240ms cubic-bezier(0.2, 0.85, 0.3, 1);
    }
    .grabber {
      display: block;
      width: 38px;
      height: 4px;
      margin: 0 auto 14px;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.18);
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 6px 0 0;
      font-size: 12.5px;
      color: var(--text-dim);
    }
    .close {
      flex: none;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: var(--card-nested);
      color: var(--text-muted);
      font-size: 20px;
      line-height: 1;
    }
    .close:hover {
      background: var(--control-active);
      color: var(--text);
    }
    .body {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
    }
    .panel.sheet footer {
      flex-direction: column-reverse;
    }
  `,
})
export class Dialog {
  private readonly breakpoint = inject(BreakpointService);

  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly dismiss = output<void>();

  protected readonly isDesktop = this.breakpoint.isDesktop;
}
