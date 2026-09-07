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
import {
  derivedProgressPercent,
  MilestoneDraft,
  milestoneTableError,
  toMilestoneDrafts,
  toMilestoneRequests,
} from '../../core/evm/milestones';
import { isStarted, previewProgress } from '../../core/evm/progress-preview';
import { formatIndex, formatMoneyRounded, formatPercent } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { Dialog } from '../../shared/ui/dialog';
import { DualProgress } from '../../shared/ui/dual-progress';
import { FormField } from '../../shared/ui/form-field';
import { MilestoneEditor } from './milestone-editor';

const STEP = 1;

/**
 * Registro de avance de una actividad.
 *
 * Solo cambian el porcentaje real y el costo incurrido; el resto de campos se reenvían tal como
 * están porque el endpoint recibe la actividad completa. Con hitos ponderados el porcentaje no es
 * un dato de entrada: se muestra la tabla de hitos y solo se registra el costo.
 */
@Component({
  selector: 'app-progress-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Dialog, DualProgress, FormField, MilestoneEditor],
  template: `
    <app-dialog
      title="Registrar avance"
      [subtitle]="activity().name"
      primaryLabel="Guardar avance"
      [primaryDisabled]="!canSave()"
      (confirm)="submit()"
      (dismiss)="dismissed.emit()"
    >
      @if (milestoneDriven()) {
        <app-milestone-editor [(milestones)]="milestones" />
        <p class="hint">
          Con hitos ponderados el avance se registra marcando los hitos cumplidos; el porcentaje lo
          deriva el servidor de sus pesos. Planificado a la fecha de corte: {{ plannedLabel() }}
        </p>
        @if (serverError()?.fieldError('milestones'); as error) {
          <p class="general-error" role="alert">{{ error }}</p>
        }
      } @else {
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
          @if (recognisesLessThanDeclared()) {
            <p class="hint">
              {{ activity().measurementMethodDescription }}: la regla reconoce
              {{ percent(preview().effectiveActualProgressPercent) }} de este avance y
              {{ percent(preview().effectivePlannedProgressPercent) }} del planificado.
            </p>
          }
        </div>
      }

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
      line-height: 1.5;
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
  protected readonly percent = formatPercent;

  protected readonly actualProgressPercent = linkedSignal(
    () => this.activity().actualProgressPercent,
  );
  protected readonly actualCost = linkedSignal(() => this.activity().actualCost);

  /**
   * Con hitos ponderados el porcentaje lo deriva el servidor de los hitos cumplidos y enviarlo es
   * un 400: aquí se registra el avance marcando hitos, y se anticipa el mismo número.
   */
  protected readonly milestoneDriven = computed(
    () => this.activity().measurementMethod === 'WEIGHTED_MILESTONES',
  );
  protected readonly milestones = linkedSignal<readonly MilestoneDraft[]>(() =>
    toMilestoneDrafts(this.activity().milestones),
  );

  /** Avance real que se enviaría: el del stepper, o el derivado de los hitos con esa regla. */
  private readonly effectiveActualInput = computed(() =>
    this.milestoneDriven()
      ? derivedProgressPercent(this.milestones())
      : Number(this.actualProgressPercent()),
  );

  protected readonly canSave = computed(
    () => !this.milestoneDriven() || milestoneTableError(this.milestones()) === null,
  );

  protected readonly percentLabel = computed(() => formatPercent(this.effectiveActualInput()));
  protected readonly plannedLabel = computed(() =>
    formatPercent(this.activity().plannedProgressPercent),
  );

  protected readonly preview = computed(() => {
    const activity = this.activity();
    const actualProgressPercent = this.effectiveActualInput();
    return previewProgress({
      budgetAtCompletion: activity.budgetAtCompletion,
      plannedProgressPercent: activity.plannedProgressPercent,
      actualProgressPercent,
      actualCost: Number(this.actualCost()),
      measurementMethod: activity.measurementMethod,
      started: isStarted(activity.actualStartDate, actualProgressPercent),
    });
  });

  /** Solo con las reglas de umbral lo reconocido puede diferir de lo declarado. */
  protected readonly recognisesLessThanDeclared = computed(() => {
    const preview = this.preview();
    return (
      preview.effectiveActualProgressPercent !== this.effectiveActualInput() ||
      preview.effectivePlannedProgressPercent !== this.activity().plannedProgressPercent
    );
  });

  /** Lectura en lenguaje llano de lo que implicaría guardar este avance. */
  protected readonly reading = computed(() => {
    const preview = this.preview();
    const { costPerformanceIndex, schedulePerformanceIndex } = preview;
    const percent = this.percentLabel();
    if (costPerformanceIndex === null) {
      return `Sin costo real registrado: la eficiencia en costo no está definida.`;
    }
    if (preview.effectiveActualProgressPercent === 0 && this.effectiveActualInput() > 0) {
      return `La regla todavía no reconoce valor para ${percent} de avance: los índices solo informarán cuando la actividad alcance el hito que la regla exige.`;
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
      actualProgressPercent: this.milestoneDriven() ? null : Number(this.actualProgressPercent()),
      actualCost: Number(this.actualCost()),
      plannedStartDate: activity.plannedStartDate,
      plannedEndDate: activity.plannedEndDate,
      actualStartDate: activity.actualStartDate,
      actualEndDate: activity.actualEndDate,
      // Registrar avance no cambia la regla de medición: se reenvía la que ya tenía.
      measurementMethod: activity.measurementMethod,
      // Con hitos ponderados el servidor exige la tabla en cada petición: se reenvía intacta.
      milestones: this.milestoneDriven() ? toMilestoneRequests(this.milestones()) : undefined,
    });
  }
}
