import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

/** Pila de avisos. Se anuncia como región viva para que un lector de pantalla los lea. */
@Component({
  selector: 'app-toast-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <article class="toast" [class]="'tone-' + toast.tone">
          <span class="dot" aria-hidden="true"></span>
          <div class="text">
            <p class="title">{{ toast.title }}</p>
            <p class="body">{{ toast.body }}</p>
          </div>
          <button type="button" (click)="service.dismiss(toast.id)" aria-label="Descartar aviso">
            &times;
          </button>
        </article>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: 26px;
      bottom: 26px;
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
    }
    @media (max-width: 767px) {
      .stack {
        left: 16px;
        right: 16px;
        bottom: 104px;
      }
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 300px;
      max-width: 380px;
      background: var(--card-nested);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-tile);
      padding: 14px 16px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
      animation: vRise 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    .toast.tone-ok {
      border-color: rgba(126, 224, 160, 0.28);
    }
    .toast.tone-info {
      border-color: rgba(139, 111, 224, 0.3);
    }
    .toast.tone-error {
      border-color: rgba(255, 138, 107, 0.32);
    }
    .dot {
      flex: none;
      width: 8px;
      height: 8px;
      margin-top: 5px;
      border-radius: 50%;
    }
    .tone-ok .dot {
      background: var(--ok);
    }
    .tone-info .dot {
      background: var(--accent);
    }
    .tone-error .dot {
      background: var(--danger);
    }
    .text {
      flex: 1;
    }
    .title {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
    }
    .body {
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-muted);
    }
    button {
      flex: none;
      border: none;
      background: none;
      color: var(--text-faint);
      font-size: 18px;
      line-height: 1;
      padding: 0;
    }
    button:hover {
      color: var(--text);
    }
  `,
})
export class ToastHost {
  protected readonly service = inject(ToastService);
  protected readonly toasts = this.service.toasts;
}
