import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';
import {
  MEASUREMENT_NOTES_MAX_LENGTH,
  MeasurementRequest,
} from '../../core/api/models/measurement';
import { Dialog } from '../../shared/ui/dialog';
import { FormField } from '../../shared/ui/form-field';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Registro de un corte.
 *
 * No se piden cifras: el servidor congela las de las actividades tal como están en ese momento.
 * Solo se elige la fecha, que no puede ser futura, y una nota opcional para anotar la gráfica.
 */
@Component({
  selector: 'app-measurement-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Dialog, FormField],
  template: `
    <app-dialog
      title="Registrar corte"
      subtitle="Congela las cifras actuales del proyecto en una fecha, para la curva S."
      primaryLabel="Registrar corte"
      [primaryDisabled]="!canSave()"
      (confirm)="submit()"
      (dismiss)="dismissed.emit()"
    >
      <app-form-field
        label="Fecha de corte"
        fieldId="measurement-date"
        [error]="dateError()"
        hint="No puede ser futura"
      >
        <input
          id="measurement-date"
          type="date"
          name="cutoffDate"
          [max]="maxDate"
          [(ngModel)]="cutoffDate"
        />
      </app-form-field>

      <app-form-field
        label="Nota"
        fieldId="measurement-notes"
        [error]="serverError()?.fieldError('notes') ?? null"
        [hint]="'Opcional, hasta ' + notesMaxLength + ' caracteres'"
      >
        <input
          id="measurement-notes"
          type="text"
          name="notes"
          autocomplete="off"
          [maxlength]="notesMaxLength"
          [(ngModel)]="notes"
        />
      </app-form-field>

      @if (conflict()) {
        <p class="conflict" role="alert">{{ conflict() }}</p>
      } @else if (generalError()) {
        <p class="conflict" role="alert">{{ generalError() }}</p>
      }
    </app-dialog>
  `,
  styles: `
    .conflict {
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--radius-input);
      background: var(--warning-soft);
      border: 1px solid rgba(231, 224, 138, 0.22);
      color: var(--warning);
      font-size: 12.5px;
      font-weight: 600;
    }
  `,
})
export class MeasurementDialog {
  readonly serverError = input<ApiError | null>(null);
  readonly save = output<MeasurementRequest>();
  readonly dismissed = output<void>();

  protected readonly notesMaxLength = MEASUREMENT_NOTES_MAX_LENGTH;
  protected readonly maxDate = today();

  protected readonly cutoffDate = signal(today());
  protected readonly notes = signal('');

  protected readonly canSave = computed(() => this.cutoffDate() !== '');

  protected readonly dateError = computed(
    () => this.serverError()?.fieldError('cutoffDate') ?? null,
  );

  /** Dos cortes del mismo proyecto en la misma fecha son un conflicto, no un campo mal escrito. */
  protected readonly conflict = computed(() => {
    const error = this.serverError();
    return error?.kind === 'conflict' ? error.detail : null;
  });

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    if (error === null || error.kind === 'validation' || error.kind === 'conflict') {
      return null;
    }
    return error.detail;
  });

  protected submit(): void {
    const notes = this.notes().trim();
    this.save.emit({ cutoffDate: this.cutoffDate(), notes: notes === '' ? null : notes });
  }
}
