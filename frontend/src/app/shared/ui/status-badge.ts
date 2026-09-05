import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Tone } from '../../core/status/status-tone';

/** Píldora de estado con el color de su tono. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'tone-' + tone()" [attr.title]="hint() ?? label()">{{
    label()
  }}</span>`,
  styles: `
    :host {
      min-width: 0;
    }
    .badge {
      display: block;
      border-radius: var(--radius-pill);
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      /* Se recorta antes que empujar a los controles vecinos fuera de la pantalla. El texto
         completo sigue disponible en el atributo de título. */
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tone-success {
      background: var(--ok-soft);
    }
    .tone-warning {
      background: var(--warning-soft);
    }
    .tone-danger {
      background: var(--danger-soft);
    }
    .tone-neutral {
      background: var(--neutral-soft);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input.required<Tone>();
  /** Motivo detallado; el backend ya lo redacta en español. */
  readonly hint = input<string | null>(null);
}
