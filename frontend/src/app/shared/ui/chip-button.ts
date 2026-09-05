import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Píldora de cabecera con chevron, el control que el diseño usa para filtros y selectores. */
@Component({
  selector: 'app-chip-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [class.open]="open()"
      [attr.aria-expanded]="expandable() ? open() : null"
      (click)="pressed.emit()"
    >
      {{ label() }}
      @if (expandable()) {
        <svg viewBox="0 0 24 24" aria-hidden="true" [class.flipped]="open()">
          <path d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z" />
        </svg>
      }
    </button>
  `,
  styles: `
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
      background: var(--control);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 18px;
      white-space: nowrap;
      transition:
        background var(--motion-veil),
        border-color var(--motion-veil),
        color var(--motion-veil);
    }
    button:hover {
      background: var(--control-hover);
      color: var(--text);
    }
    button.open {
      background: var(--control-hover);
      border-color: rgba(139, 111, 224, 0.45);
      color: var(--text);
    }
    svg {
      width: 16px;
      height: 16px;
      fill: var(--text-dim);
      transition: transform 200ms ease;
    }
    svg.flipped {
      transform: rotate(180deg);
    }
  `,
})
export class ChipButton {
  readonly label = input.required<string>();
  readonly open = input(false);
  /** Muestra el chevron. Se apaga para las píldoras que solo son un botón. */
  readonly expandable = input(true);
  readonly pressed = output<void>();
}
