import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';

import { BreakpointService } from '../../core/layout/breakpoint.service';
import { ScrollLock } from '../../core/layout/scroll-lock';

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
        <button type="button" class="secondary" (click)="dismiss.emit()">
          {{ secondaryLabel() }}
        </button>
        <button
          type="button"
          class="primary"
          [disabled]="primaryDisabled()"
          (click)="confirm.emit()"
        >
          {{ primaryLabel() }}
        </button>
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
      overscroll-behavior: contain;
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
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 28px 28px 0 0;
      padding: 10px 20px calc(26px + env(safe-area-inset-bottom, 0px));
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
    .primary,
    .secondary {
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 700;
      padding: 12px 22px;
      transition: background var(--motion-veil);
    }
    .primary {
      background: #fff;
      color: var(--screen);
    }
    .primary:hover {
      background: rgba(255, 255, 255, 0.88);
    }
    .primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .secondary {
      background: var(--control-hover);
      color: var(--text-muted);
      font-weight: 600;
    }
    /* Hoja: título a 19 px, botón principal a todo el ancho y "Cancelar" como texto, como en el diseño. */
    .panel.sheet h2 {
      font-size: 19px;
      letter-spacing: -0.025em;
    }
    .panel.sheet .subtitle {
      margin-top: 3px;
      font-size: 12px;
    }
    .panel.sheet .body {
      margin-top: 18px;
    }
    .panel.sheet footer {
      flex-direction: column-reverse;
      gap: 4px;
      margin-top: 14px;
    }
    .panel.sheet .primary {
      width: 100%;
      font-size: 14px;
      padding: 15px;
      text-align: center;
    }
    .panel.sheet .secondary {
      width: 100%;
      background: none;
      border-color: transparent;
      font-size: 13.5px;
      padding: 12px 4px 6px;
      text-align: center;
    }
  `,
})
export class Dialog {
  private readonly breakpoint = inject(BreakpointService);
  private readonly scrollLock = inject(ScrollLock);

  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  /** Rótulo del botón principal; el pie lo pinta el diálogo para que escritorio y hoja coincidan. */
  readonly primaryLabel = input.required<string>();
  readonly primaryDisabled = input(false, { transform: booleanAttribute });
  readonly secondaryLabel = input('Cancelar');
  readonly dismiss = output<void>();
  readonly confirm = output<void>();

  protected readonly isDesktop = this.breakpoint.isDesktop;

  constructor() {
    this.scrollLock.lock();
    inject(DestroyRef).onDestroy(() => this.scrollLock.unlock());
  }
}
