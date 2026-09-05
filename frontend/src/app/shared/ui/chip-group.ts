import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** Selector de una sola opción en forma de píldoras. */
@Component({
  selector: 'app-chip-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          class="chip"
          [class.active]="option.value === selected()"
          [attr.aria-checked]="option.value === selected()"
          [disabled]="disabled()"
          (click)="selected.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .chip {
      border: 1px solid transparent;
      border-radius: var(--radius-pill);
      background: var(--control-hover);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 18px;
      transition:
        background var(--motion-veil),
        color var(--motion-veil);
    }
    .chip:hover:not(:disabled):not(.active) {
      background: var(--control-active);
      color: var(--text);
    }
    .chip.active {
      background: #fff;
      color: var(--screen);
      font-weight: 700;
    }
    .chip:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `,
})
export class ChipGroup<T extends string> {
  readonly options = input.required<readonly ChipOption<T>[]>();
  readonly selected = model.required<T>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
}
