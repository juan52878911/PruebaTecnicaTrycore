import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ToastService } from './toast.service';

/**
 * Botón para copiar una cifra al portapapeles.
 *
 * Aparece al apuntar la tarjeta, como en el diseño: no compite con el dato mientras solo se lee.
 * Sigue siendo alcanzable con el teclado, porque un control que solo existe al pasar el ratón deja
 * fuera a quien navega tabulando.
 */
@Component({
  selector: 'app-copy-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [attr.aria-label]="'Copiar ' + label()" (click)="copy()">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
        />
      </svg>
    </button>
  `,
  styles: `
    button {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      opacity: 0;
      transform: scale(0.9);
      transition:
        opacity 0.16s ease,
        transform 0.16s ease,
        background 0.16s ease;
    }
    :host-context(.reveal-on-hover:hover) button,
    :host-context(.reveal-on-hover:focus-within) button,
    button:focus-visible {
      opacity: 1;
      transform: scale(1);
    }
    button:hover {
      background: rgba(255, 255, 255, 0.14);
    }
    svg {
      width: 14px;
      height: 14px;
      fill: rgba(255, 255, 255, 0.6);
    }
  `,
})
export class CopyValue {
  private readonly toasts = inject(ToastService);

  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly unit = input<string | null>('USD');

  protected async copy(): Promise<void> {
    const text = this.value();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer, pero el aviso sigue siendo útil:
      // confirma qué valor se intentó copiar.
    }
    const unit = this.unit();
    this.toasts.success('Valor copiado', unit === null ? text : `${text} ${unit}`);
  }
}
