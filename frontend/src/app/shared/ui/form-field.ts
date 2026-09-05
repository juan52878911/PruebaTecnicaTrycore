import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Etiqueta, control y mensaje de error de un campo.
 *
 * El `for` del `label` se ata al identificador que recibe, no al orden del DOM: sin eso, la regla
 * de accesibilidad de las plantillas rompe el lint y, más importante, un lector de pantalla no
 * sabría qué etiqueta corresponde a qué control.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <label [attr.for]="fieldId()">{{ label() }}</label>
      <div class="control" [class.invalid]="!!error()">
        <ng-content />
        @if (suffix()) {
          <span class="suffix">{{ suffix() }}</span>
        }
      </div>
      @if (error()) {
        <p class="error" [id]="fieldId() + '-error'" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    label {
      display: block;
      margin-bottom: 7px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .control {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--card-nested);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-input);
      padding: 0 15px;
      transition: border-color var(--motion-border);
    }
    .control:focus-within {
      border-color: var(--focus-ring);
    }
    .control.invalid {
      border-color: var(--danger);
    }
    .control ::ng-deep input,
    .control ::ng-deep select,
    .control ::ng-deep textarea {
      flex: 1;
      min-width: 0;
      border: none;
      background: none;
      outline: none;
      padding: 13px 0;
      font-size: 13.5px;
      font-weight: 600;
    }
    .suffix {
      flex: none;
      font-size: 13px;
      color: var(--text-faint);
    }
    .error {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--danger);
    }
    .hint {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--text-dim);
    }
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly suffix = input<string | null>(null);
}
