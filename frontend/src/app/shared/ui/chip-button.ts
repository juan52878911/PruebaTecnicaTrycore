import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Píldora de cabecera con chevron, el control que el diseño usa para filtros y selectores.
 *
 * Con `informative` deja de ser un botón: es una etiqueta más pequeña y sin relieve, como el
 * "Corte: 31 ago" del diseño, para que nada que no haga nada parezca pulsable.
 */
@Component({
  selector: 'app-chip-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (informative()) {
      <span class="tag">{{ label() }}</span>
    } @else {
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
    }
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
    .tag {
      display: inline-flex;
      align-items: center;
      border-radius: var(--radius-pill);
      background: var(--control-hover);
      color: var(--text-dim);
      font-size: 12px;
      font-weight: 600;
      padding: 9px 14px;
      white-space: nowrap;
      cursor: default;
    }
  `,
})
export class ChipButton {
  readonly label = input.required<string>();
  readonly open = input(false);
  /** Muestra el chevron. Se apaga para las píldoras que solo son un botón. */
  readonly expandable = input(true);
  /** Etiqueta de solo lectura: sin botón, sin hover y sin chevron. */
  readonly informative = input(false, { transform: booleanAttribute });
  readonly pressed = output<void>();
}
