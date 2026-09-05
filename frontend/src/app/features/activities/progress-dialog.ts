import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiError } from '../../core/api/api-error';
import {
  Activity,
  ActivityRequest,
  PERCENT_MAX,
  PERCENT_MIN,
} from '../../core/api/models/activity';
import { previewProgress } from '../../core/evm/progress-preview';
import { formatIndex, formatMoneyRounded, formatPercent } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { Dialog } from '../../shared/ui/dialog';
import { DualProgress } from '../../shared/ui/dual-progress';
import { FormField } from '../../shared/ui/form-field';

const STEP = 1;

/**
 * Registro de avance de una actividad.
 *
 * Solo cambian el porcentaje real y el costo incurrido; el resto de campos se reenvían tal como
 * están porque el endpoint recibe la actividad completa.
 */
@Component({
  selector: 'app-progress-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Dialog, DualProgress, FormField],
  template: `
    <app-dialog title="Registrar avance" [subtitle]="activity().name" (dismiss)="dismissed.emit()">
      <div class="stepper">
        <div class="stepper-head">
          <span class="label">% de avance real</span>
          <span class="value">{{ percentLabel() }}</span>
        </div>
        <div class="stepper-controls">
          <button type="button" (click)="decrease()" aria-label="Reducir un punto">−</button>
          <div class="bar">
            <app-dual-progress
              [planned]="activity().plannedProgressPercent"
              [actual]="actualProgressPercent()"
            />
          </div>
          <button type="button" (click)="increase()" aria-label="Aumentar un punto">+</button>
        </div>
        <p class="hint">Planificado a la fecha de corte: {{ plannedLabel() }}</p>
      </div>

      <app-form-field
        [label]="'Costo real acumulado · ' + labels.inline('AC')"
        fieldId="progress-cost"
        suffix="USD"
        [error]="serverError()?.fieldError('actualCost') ?? null"
      >
        <input
          id="progress-cost"
          type="number"
          name="actualCost"
          min="0"
          step="0.01"
          [(ngModel)]="actualCost"
        />
      </app-form-field>

      <section class="preview">
        <h3>Indicadores resultantes</h3>
        <p class="disclaimer">
          Estimación en el navegador. El cálculo oficial lo hace el servidor al guardar.
        </p>
        <dl>
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
        <p class="reading">{{ reading() }}</p>
      </section>

      @if (generalError()) {
        <p class="general-error" role="alert">{{ generalError() }}</p>
      }

      <ng-container dialogActions>
        <button type="button" class="secondary" (click)="dismissed.emit()">Cancelar</button>
        <button type="button" class="primary" (click)="submit()">Guardar avance</button>
      </ng-container>
    </app-dialog>
  `,
  styles: `
    .stepper-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .value {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-text);
    }
    .stepper-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .stepper-controls button {
      flex: none;
      width: 38px;
      height: 38px;
      border: none;
      border-radius: var(--radius-input);
      background: var(--card-nested);
      color: var(--text);
      font-size: 18px;
    }
    .stepper-controls button:hover {
      background: var(--control-active);
    }
    .bar {
      flex: 1;
      min-width: 0;
    }
    .hint {
      margin: 12px 0 0;
      font-size: 12px;
      color: var(--text-dim);
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
      grid-template-columns: repeat(3, 1fr);
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
      font-size: 16px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .reading {
      margin: 14px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--divider);
      font-size: 12.5px;
      line-height: 1.5;
      color: var(--text-muted);
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
    .secondary {
      background: var(--control-hover);
      color: var(--text-muted);
      font-weight: 600;
    }
  `,
})
export class ProgressDialog {
  protected readonly labels = inject(IndicatorLabels);

  readonly activity = input.required<Activity>();
  readonly serverError = input<ApiError | null>(null);
  readonly save = output<ActivityRequest>();
  readonly dismissed = output<void>();

  protected readonly money = formatMoneyRounded;
  protected readonly index = formatIndex;

  protected readonly actualProgressPercent = linkedSignal(
    () => this.activity().actualProgressPercent,
  );
  protected readonly actualCost = linkedSignal(() => this.activity().actualCost);

  protected readonly percentLabel = computed(() => formatPercent(this.actualProgressPercent()));
  protected readonly plannedLabel = computed(() =>
    formatPercent(this.activity().plannedProgressPercent),
  );

  protected readonly preview = computed(() =>
    previewProgress({
      budgetAtCompletion: this.activity().budgetAtCompletion,
      plannedProgressPercent: this.activity().plannedProgressPercent,
      actualProgressPercent: Number(this.actualProgressPercent()),
      actualCost: Number(this.actualCost()),
    }),
  );

  /** Lectura en lenguaje llano de lo que implicaría guardar este avance. */
  protected readonly reading = computed(() => {
    const { costPerformanceIndex, schedulePerformanceIndex } = this.preview();
    const percent = this.percentLabel();
    if (costPerformanceIndex === null) {
      return `Sin costo real registrado: la eficiencia en costo no está definida.`;
    }
    const overBudget = costPerformanceIndex < 1;
    const late = schedulePerformanceIndex !== null && schedulePerformanceIndex < 1;
    if (overBudget && late) {
      return `Con ${percent} de avance la actividad seguiría con sobrecosto y atrasada.`;
    }
    if (overBudget) {
      return `Con ${percent} de avance habría sobrecosto, aunque el plazo se mantiene.`;
    }
    if (late) {
      return `Con ${percent} de avance el costo se mantiene, pero la actividad iría atrasada.`;
    }
    return `Con ${percent} de avance la actividad quedaría dentro de presupuesto y al día.`;
  });

  protected readonly generalError = computed(() => {
    const error = this.serverError();
    if (error === null || error.kind === 'validation') {
      return null;
    }
    return error.detail;
  });

  protected increase(): void {
    this.actualProgressPercent.update((value) => Math.min(PERCENT_MAX, Number(value) + STEP));
  }

  protected decrease(): void {
    this.actualProgressPercent.update((value) => Math.max(PERCENT_MIN, Number(value) - STEP));
  }

  protected submit(): void {
    const activity = this.activity();
    this.save.emit({
      name: activity.name,
      budgetAtCompletion: activity.budgetAtCompletion,
      plannedProgressPercent: activity.plannedProgressPercent,
      actualProgressPercent: Number(this.actualProgressPercent()),
      actualCost: Number(this.actualCost()),
      plannedStartDate: activity.plannedStartDate,
      plannedEndDate: activity.plannedEndDate,
      actualStartDate: activity.actualStartDate,
      actualEndDate: activity.actualEndDate,
      // Registrar avance no cambia la regla de medición: se reenvía la que ya tenía.
      measurementMethod: activity.measurementMethod,
    });
  }
}
