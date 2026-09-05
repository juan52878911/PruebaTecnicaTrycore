import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';
import {
  Project,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_MANAGER_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  ProjectRequest,
} from '../../core/api/models/project';
import { Dialog } from '../../shared/ui/dialog';
import { FormField } from '../../shared/ui/form-field';

/**
 * Alta y edición de proyecto.
 *
 * El diseño no trae este formulario, así que se construye con el mismo lenguaje que el de
 * actividad: mismo diálogo, mismos campos, mismos botones.
 */
@Component({
  selector: 'app-project-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Dialog, FormField],
  template: `
    <app-dialog
      [title]="isEdit() ? 'Editar proyecto' : 'Nuevo proyecto'"
      subtitle="El nombre identifica al proyecto en el panel y en los informes."
      (dismiss)="dismissed.emit()"
    >
      <app-form-field
        label="Nombre"
        fieldId="project-name"
        [error]="nameError()"
        [hint]="'Hasta ' + nameMaxLength + ' caracteres'"
      >
        <input
          id="project-name"
          type="text"
          name="name"
          autocomplete="off"
          [maxlength]="nameMaxLength"
          [(ngModel)]="name"
        />
      </app-form-field>

      <app-form-field
        label="Descripción"
        fieldId="project-description"
        [error]="serverError()?.fieldError('description') ?? null"
        [hint]="'Opcional, hasta ' + descriptionMaxLength + ' caracteres'"
      >
        <textarea
          id="project-description"
          name="description"
          rows="3"
          [maxlength]="descriptionMaxLength"
          [(ngModel)]="description"
        ></textarea>
      </app-form-field>

      <app-form-field
        label="Responsable"
        fieldId="project-manager"
        [error]="serverError()?.fieldError('manager') ?? null"
        [hint]="'Opcional, hasta ' + managerMaxLength + ' caracteres'"
      >
        <input
          id="project-manager"
          type="text"
          name="manager"
          autocomplete="off"
          [maxlength]="managerMaxLength"
          [(ngModel)]="manager"
        />
      </app-form-field>

      @if (generalError()) {
        <p class="general-error" role="alert">{{ generalError() }}</p>
      }

      <ng-container dialogActions>
        <button type="button" class="secondary" (click)="dismissed.emit()">Cancelar</button>
        <button type="button" class="primary" [disabled]="!canSave()" (click)="submit()">
          {{ isEdit() ? 'Guardar cambios' : 'Crear proyecto' }}
        </button>
      </ng-container>
    </app-dialog>
  `,
  styles: `
    .general-error {
      margin: 0;
      font-size: 12.5px;
      color: var(--danger);
    }
    .primary,
    .secondary {
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 700;
      padding: 12px 22px;
      border: 1px solid transparent;
    }
    .primary {
      background: #fff;
      color: var(--screen);
    }
    .primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .secondary {
      background: var(--control-hover);
      color: var(--text-muted);
      font-weight: 600;
    }
  `,
})
export class ProjectFormDialog {
  readonly project = input<Project | null>(null);
  readonly serverError = input<ApiError | null>(null);
  readonly save = output<ProjectRequest>();
  readonly dismissed = output<void>();

  protected readonly nameMaxLength = PROJECT_NAME_MAX_LENGTH;
  protected readonly descriptionMaxLength = PROJECT_DESCRIPTION_MAX_LENGTH;
  protected readonly managerMaxLength = PROJECT_MANAGER_MAX_LENGTH;

  // linkedSignal y no signal: el valor inicial viene de una entrada, que en el constructor
  // todavía no está resuelta, y así el formulario se resiembra solo si cambia el proyecto.
  protected readonly name = linkedSignal(() => this.project()?.name ?? '');
  protected readonly description = linkedSignal(() => this.project()?.description ?? '');
  protected readonly manager = linkedSignal(() => this.project()?.manager ?? '');

  protected readonly isEdit = computed(() => this.project() !== null);
  protected readonly canSave = computed(() => this.name().trim().length > 0);

  protected readonly nameError = computed(() => this.serverError()?.fieldError('name') ?? null);
  protected readonly generalError = computed(() => {
    const error = this.serverError();
    if (error === null || error.kind === 'validation') {
      return null;
    }
    return error.detail;
  });

  protected submit(): void {
    this.save.emit({
      name: this.name().trim(),
      description: this.orNull(this.description()),
      manager: this.orNull(this.manager()),
    });
  }

  private orNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}
