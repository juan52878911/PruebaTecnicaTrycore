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
  ACTIVITY_NAME_MAX_LENGTH,
  Activity,
  ActivityRequest,
  MeasurementMethod,
  MONEY_DECIMAL_PLACES,
  PERCENT_DECIMAL_PLACES,
  PERCENT_MAX,
  PERCENT_MIN,
} from '../../core/api/models/activity';
import { previewProgress } from '../../core/evm/progress-preview';
import { formatIndex, formatMoneyRounded } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { Dialog } from '../../shared/ui/dialog';
import { FormField } from '../../shared/ui/form-field';
import { inject } from '@angular/core';

const DECIMAL_FACTOR = 10;

/** Cuenta los decimales de un número escrito por el usuario. */
function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Alta y edición de actividad, con vista previa del cálculo. */
@Component({
  selector: 'app-activity-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Dialog, FormField],
  template: `
    <app-dialog
      [title]="isEdit() ? 'Editar actividad' : 'Nueva actividad'"
      subtitle="Los indicadores los calcula el servidor al guardar."
      (dismiss)="dismissed.emit()"
    >
      <app-form-field label="Nombre" fieldId="activity-name" [error]="fieldError('name')">
        <input
          id="activity-name"
          type="text"
          name="name"
          autocomplete="off"
          [maxlength]="nameMaxLength"
          [(ngModel)]="name"
        />
      </app-form-field>

      <app-form-field
        [label]="'Presupuesto planificado · ' + labels.inline('BAC')"
        fieldId="activity-bac"
        suffix="USD"
        [error]="fieldError('budgetAtCompletion') ?? moneyError(budgetAtCompletion())"
      >
        <input
          id="activity-bac"
          type="number"
          name="budgetAtCompletion"
          min="0"
          step="0.01"
          [(ngModel)]="budgetAtCompletion"
        />
      </app-form-field>

      <div class="pair">
        <app-form-field
          label="% avance planificado"
          fieldId="activity-planned"
          [error]="fieldError('plannedProgressPercent') ?? percentError(plannedProgressPercent())"
        >
          <input
            id="activity-planned"
            type="number"
            name="plannedProgressPercent"
            [min]="percentMin"
            [max]="percentMax"
            step="0.01"
            [(ngModel)]="plannedProgressPercent"
          />
        </app-form-field>
        <app-form-field
          label="% avance real"
          fieldId="activity-actual"
          [error]="fieldError('actualProgressPercent') ?? percentError(actualProgressPercent())"
        >
          <input
            id="activity-actual"
            type="number"
            name="actualProgressPercent"
            [min]="percentMin"
            [max]="percentMax"
            step="0.01"
            [(ngModel)]="actualProgressPercent"
          />
        </app-form-field>
      </div>

      <app-form-field label="Regla de medición" fieldId="activity-method" [hint]="methodHint()">
        <select id="activity-method" name="measurementMethod" [(ngModel)]="measurementMethod">
          @for (option of methodOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </app-form-field>

      <app-form-field
        [label]="'Costo real incurrido · ' + labels.inline('AC')"
        fieldId="activity-ac"
        suffix="USD"
        [error]="fieldError('actualCost') ?? moneyError(actualCost())"
      >
        <input
          id="activity-ac"
          type="number"
          name="actualCost"
          min="0"
          step="0.01"
          [(ngModel)]="actualCost"
        />
      </app-form-field>

      <div class="pair">
        <app-form-field label="Inicio previsto" fieldId="activity-planned-start">
          <input
            id="activity-planned-start"
            type="date"
            name="plannedStartDate"
            [(ngModel)]="plannedStartDate"
          />
        </app-form-field>
        <app-form-field
          label="Fin previsto"
          fieldId="activity-planned-end"
          [error]="plannedRangeError()"
        >
          <input
            id="activity-planned-end"
            type="date"
            name="plannedEndDate"
            [(ngModel)]="plannedEndDate"
          />
        </app-form-field>
      </div>

      <div class="pair">
        <app-form-field label="Inicio real" fieldId="activity-actual-start">
          <input
            id="activity-actual-start"
            type="date"
            name="actualStartDate"
            [(ngModel)]="actualStartDate"
          />
        </app-form-field>
        <app-form-field label="Fin real" fieldId="activity-actual-end" [error]="actualRangeError()">
          <input
            id="activity-actual-end"
            type="date"
            name="actualEndDate"
            [(ngModel)]="actualEndDate"
          />
        </app-form-field>
      </div>

      <section class="preview">
        <h3>Vista previa del cálculo</h3>
        <p class="disclaimer">
          Estimación en el navegador para orientar mientras se escribe. El cálculo oficial lo hace
          el servidor y es el que queda al guardar.
        </p>
        <dl>
          <div>
            <dt>{{ labels.short('PV') }}</dt>
            <dd>{{ money(preview().plannedValue) }}</dd>
          </div>
          <div>
            <dt>{{ labels.short('EV') }}</dt>
            <dd>{{ money(preview().earnedValue) }}</dd>
          </div>
          <div>
            <dt>{{ labels.short('CPI') }}</dt>
            <dd>{{ index(preview().costPerformanceIndex) }}</dd>
          </div>
          <div>
            <dt>{{ labels.short('SPI') }}</dt>
            <dd>{{ index(preview().schedulePerformanceIndex) }}</dd>
          </div>
        </dl>
      </section>

      @if (generalError()) {
        <p class="general-error" role="alert">{{ generalError() }}</p>
      }

      <ng-container dialogActions>
        <button type="button" class="secondary" (click)="dismissed.emit()">Cancelar</button>
        <button type="button" class="primary" [disabled]="!canSave()" (click)="submit()">
          Guardar actividad
        </button>
      </ng-container>
    </app-dialog>
  `,
  styles: `
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .preview {
      background: var(--card-nested);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .preview h3 {
      margin: 0;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    .disclaimer {
      margin: 8px 0 14px;
      font-size: 11.5px;
      line-height: 1.5;
      color: var(--text-dim);
    }
    dl {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 0;
    }
    dt {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
    }
    dd {
      margin: 6px 0 0;
      font-size: 15px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
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
    @media (max-width: 600px) {
      dl {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `,
})
export class ActivityFormDialog {
  protected readonly labels = inject(IndicatorLabels);

  readonly activity = input<Activity | null>(null);
  readonly serverError = input<ApiError | null>(null);
  readonly save = output<ActivityRequest>();
  readonly dismissed = output<void>();

  protected readonly nameMaxLength = ACTIVITY_NAME_MAX_LENGTH;
  protected readonly percentMin = PERCENT_MIN;
  protected readonly percentMax = PERCENT_MAX;
  protected readonly money = formatMoneyRounded;
  protected readonly index = formatIndex;

  protected readonly name = linkedSignal(() => this.activity()?.name ?? '');
  protected readonly budgetAtCompletion = linkedSignal(
    () => this.activity()?.budgetAtCompletion ?? 0,
  );
  protected readonly plannedProgressPercent = linkedSignal(
    () => this.activity()?.plannedProgressPercent ?? 0,
  );
  protected readonly actualProgressPercent = linkedSignal(
    () => this.activity()?.actualProgressPercent ?? 0,
  );
  protected readonly actualCost = linkedSignal(() => this.activity()?.actualCost ?? 0);
  protected readonly plannedStartDate = linkedSignal(() => this.activity()?.plannedStartDate ?? '');
  protected readonly plannedEndDate = linkedSignal(() => this.activity()?.plannedEndDate ?? '');
  protected readonly actualStartDate = linkedSignal(() => this.activity()?.actualStartDate ?? '');
  protected readonly actualEndDate = linkedSignal(() => this.activity()?.actualEndDate ?? '');
  protected readonly measurementMethod = linkedSignal<MeasurementMethod>(
    () => this.activity()?.measurementMethod ?? 'PERCENT_COMPLETE',
  );

  /**
   * Las cuatro reglas del contrato.
   *
   * La regla se aplica al valor planificado y al ganado a la vez: restar dos cifras medidas con
   * varas distintas fabricaría atrasos que no existen.
   */
  protected readonly methodOptions: readonly { value: MeasurementMethod; label: string }[] = [
    { value: 'PERCENT_COMPLETE', label: 'Porcentaje completado' },
    { value: 'FIXED_0_100', label: '0 / 100 — nada hasta cerrar' },
    { value: 'FIXED_50_50', label: '50 / 50 — mitad al iniciar' },
    { value: 'WEIGHTED_MILESTONES', label: 'Hitos ponderados' },
  ];

  protected readonly methodHint = computed(() => {
    switch (this.measurementMethod()) {
      case 'FIXED_0_100':
        return 'No reconoce valor hasta llegar al 100 %, y entonces todo.';
      case 'FIXED_50_50':
        return 'Reconoce la mitad al iniciar y el resto al cerrar. Una actividad se considera iniciada si tiene fecha real de inicio o avance declarado.';
      case 'WEIGHTED_MILESTONES':
        return 'Deriva el avance de los hitos cumplidos y sus pesos.';
      default:
        return 'Reconoce el porcentaje declarado tal cual.';
    }
  });

  protected readonly isEdit = computed(() => this.activity() !== null);

  protected readonly preview = computed(() =>
    previewProgress({
      budgetAtCompletion: Number(this.budgetAtCompletion()),
      plannedProgressPercent: Number(this.plannedProgressPercent()),
      actualProgressPercent: Number(this.actualProgressPercent()),
      actualCost: Number(this.actualCost()),
    }),
  );

  protected readonly plannedRangeError = computed(() =>
    this.rangeError(this.plannedStartDate(), this.plannedEndDate()),
  );
  protected readonly actualRangeError = computed(() =>
    this.rangeError(this.actualStartDate(), this.actualEndDate()),
  );

  protected readonly canSave = computed(
    () =>
      this.name().trim().length > 0 &&
      this.moneyError(this.budgetAtCompletion()) === null &&
      this.moneyError(this.actualCost()) === null &&
      this.percentError(this.plannedProgressPercent()) === null &&
      this.percentError(this.actualProgressPercent()) === null &&
      this.plannedRangeError() === null &&
      this.actualRangeError() === null,
  );

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    if (error === null || error.kind === 'validation') {
      return null;
    }
    return error.detail;
  });

  protected fieldError(field: string): string | null {
    return this.serverError()?.fieldError(field) ?? null;
  }

  /**
   * El backend rechaza con 400 más de dos decimales: no redondea. Avisar aquí evita un viaje al
   * servidor para descubrir algo que el formulario ya sabe.
   */
  protected moneyError(value: number): string | null {
    if (!Number.isFinite(value) || value < 0) {
      return 'Debe ser un importe positivo';
    }
    return decimalsOf(value) > MONEY_DECIMAL_PLACES
      ? `Admite como máximo ${MONEY_DECIMAL_PLACES} decimales`
      : null;
  }

  protected percentError(value: number): string | null {
    if (!Number.isFinite(value) || value < PERCENT_MIN || value > PERCENT_MAX) {
      return `Debe estar entre ${PERCENT_MIN} y ${PERCENT_MAX}`;
    }
    return decimalsOf(value) > PERCENT_DECIMAL_PLACES
      ? `Admite como máximo ${PERCENT_DECIMAL_PLACES} decimales`
      : null;
  }

  private rangeError(start: string, end: string): string | null {
    if (start === '' || end === '') {
      return null;
    }
    return end < start ? 'La fecha de fin no puede ser anterior a la de inicio' : null;
  }

  protected submit(): void {
    this.save.emit({
      name: this.name().trim(),
      budgetAtCompletion: this.round(Number(this.budgetAtCompletion())),
      plannedProgressPercent: this.round(Number(this.plannedProgressPercent())),
      actualProgressPercent: this.round(Number(this.actualProgressPercent())),
      actualCost: this.round(Number(this.actualCost())),
      plannedStartDate: this.orNull(this.plannedStartDate()),
      plannedEndDate: this.orNull(this.plannedEndDate()),
      actualStartDate: this.orNull(this.actualStartDate()),
      actualEndDate: this.orNull(this.actualEndDate()),
      measurementMethod: this.measurementMethod(),
    });
  }

  private round(value: number): number {
    const factor = DECIMAL_FACTOR ** MONEY_DECIMAL_PLACES;
    return Math.round(value * factor) / factor;
  }

  private orNull(value: string): string | null {
    return value === '' ? null : value;
  }
}
