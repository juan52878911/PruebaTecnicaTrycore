import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Caja punteada para cuando no hay nada que mostrar todavía. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="icon" aria-hidden="true"></div>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      @if (actionLabel()) {
        <button type="button" class="cta" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
  styles: `
    .empty {
      background: var(--card);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-card);
      padding: 44px 32px;
      text-align: center;
    }
    .icon {
      width: 52px;
      height: 52px;
      margin: 0 auto 18px;
      border-radius: var(--radius-tile);
      background: var(--card-nested);
      position: relative;
    }
    .icon::after {
      content: '';
      position: absolute;
      inset: 16px;
      border: 2px solid var(--text-faint);
      border-radius: 6px;
    }
    h3 {
      margin: 0 0 10px;
      font-size: 16px;
      font-weight: 700;
    }
    p {
      margin: 0 auto;
      max-width: 340px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-muted);
    }
    .cta {
      margin-top: 20px;
      border: none;
      border-radius: var(--radius-pill);
      background: #fff;
      color: var(--screen);
      font-size: 13px;
      font-weight: 700;
      padding: 12px 22px;
    }
    .cta:hover {
      background: rgba(255, 255, 255, 0.88);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
