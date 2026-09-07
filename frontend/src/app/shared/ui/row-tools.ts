import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Editar y borrar de una fila de listado.
 *
 * Son iconos y no texto para que la fila quede limpia como en el diseño, y solo aparecen al
 * apuntarla o al entrar en ella con el teclado. La fila entera es la que navega, así que los dos
 * botones detienen la propagación: pulsar "borrar" no debe abrir el detalle de paso.
 */
@Component({
  selector: 'app-row-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="tool"
      [attr.aria-label]="'Editar ' + name()"
      title="Editar"
      (click)="onEdit($event)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        />
      </svg>
    </button>
    <button
      type="button"
      class="tool danger"
      [attr.aria-label]="'Borrar ' + name()"
      title="Borrar"
      (click)="onRemove($event)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
      </svg>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 6px;
      opacity: 0;
      transition: opacity var(--motion-veil);
    }
    :host-context(.row:hover),
    :host-context(.row:focus-within),
    :host(:focus-within) {
      opacity: 1;
    }
    @media (hover: none) {
      :host {
        opacity: 1;
      }
    }
    .tool {
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
      transition:
        background var(--motion-veil),
        color var(--motion-veil);
    }
    .tool:hover {
      background: rgba(255, 255, 255, 0.14);
      color: var(--text);
    }
    .tool.danger:hover {
      background: rgba(255, 138, 107, 0.16);
      color: var(--danger);
    }
    svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
  `,
})
export class RowTools {
  readonly name = input.required<string>();
  readonly edit = output<void>();
  readonly remove = output<void>();

  protected onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit();
  }

  protected onRemove(event: Event): void {
    event.stopPropagation();
    this.remove.emit();
  }
}
