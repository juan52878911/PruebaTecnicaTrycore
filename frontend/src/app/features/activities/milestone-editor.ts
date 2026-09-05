import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';

import { formatPercent } from '../../core/format/evm-format';
import {
  derivedProgressPercent,
  EMPTY_MILESTONE,
  MILESTONE_NAME_MAX_LENGTH,
  MILESTONE_WEIGHT_TOTAL,
  MilestoneDraft,
  milestoneTableError,
  milestoneWeightSum,
} from '../../core/evm/milestones';

/**
 * Tabla de hitos de una actividad medida por hitos ponderados.
 *
 * Con `structural` se editan nombres y pesos y se añaden o quitan filas; sin él solo se marca el
 * cumplimiento y su fecha, que es lo único que cambia al registrar avance. La lista se emite
 * entera en cada cambio: el servidor la reemplaza en bloque, así que aquí tampoco hay hito suelto.
 */
@Component({
  selector: 'app-milestone-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <span class="title">Hitos</span>
      <span class="derived">Avance derivado: {{ percent(derived()) }}</span>
    </div>
    <ul>
      @for (milestone of milestones(); track $index; let i = $index) {
        <li>
          <input
            type="checkbox"
            [id]="'milestone-achieved-' + i"
            [attr.aria-label]="'Cumplido: ' + (milestone.name || 'hito ' + (i + 1))"
            [checked]="milestone.achieved"
            (change)="toggle(i, $event)"
          />
          @if (structural()) {
            <input
              class="name"
              type="text"
              placeholder="Nombre del hito"
              [attr.aria-label]="'Nombre del hito ' + (i + 1)"
              [attr.maxlength]="nameMaxLength"
              [value]="milestone.name"
              (input)="rename(i, $event)"
            />
            <label class="weight">
              <input
                type="number"
                min="0"
                [max]="weightTotal"
                step="0.01"
                [attr.aria-label]="'Peso del hito ' + (i + 1)"
                [value]="milestone.weightPercent"
                (input)="reweigh(i, $event)"
              />
              <span>%</span>
            </label>
          } @else {
            <span class="name-text" [class.achieved]="milestone.achieved">{{
              milestone.name
            }}</span>
            <span class="weight-text">{{ percent(milestone.weightPercent) }}</span>
          }
          <input
            class="date"
            type="date"
            [attr.aria-label]="'Fecha de cumplimiento del hito ' + (i + 1)"
            [disabled]="!milestone.achieved"
            [value]="milestone.achievedOn"
            (input)="redate(i, $event)"
          />
          @if (structural()) {
            <button
              type="button"
              class="remove"
              [attr.aria-label]="'Quitar hito ' + (i + 1)"
              (click)="remove(i)"
            >
              ×
            </button>
          }
        </li>
      }
    </ul>
    <div class="foot">
      <span class="sum" [class.invalid]="error() !== null">
        Suma de pesos: {{ percent(sum()) }} de {{ percent(weightTotal) }}
      </span>
      @if (structural()) {
        <button type="button" class="add" (click)="add()">+ Añadir hito</button>
      }
    </div>
    @if (error(); as message) {
      <p class="error">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      background: var(--card-nested);
      border-radius: 14px;
      padding: 14px 16px;
    }
    .head,
    .foot {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }
    .title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    .derived {
      font-size: 13px;
      font-weight: 700;
      color: var(--accent-text);
    }
    ul {
      list-style: none;
      margin: 12px 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) 92px 150px auto;
      align-items: center;
      gap: 8px;
    }
    li input[type='checkbox'] {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
    }
    li input[type='text'],
    li input[type='number'],
    li input[type='date'] {
      width: 100%;
      min-width: 0;
      padding: 8px 10px;
      font-size: 12.5px;
    }
    .weight {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-dim);
    }
    .name-text {
      font-size: 12.5px;
      color: var(--text-muted);
    }
    .name-text.achieved {
      color: var(--text);
    }
    .weight-text {
      font-size: 12.5px;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .date:disabled {
      opacity: 0.4;
    }
    .remove,
    .add {
      border: none;
      border-radius: var(--radius-pill);
      background: var(--control-hover);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 10px;
    }
    .remove {
      width: 28px;
      height: 28px;
      padding: 0;
      font-size: 16px;
    }
    .sum {
      font-size: 12px;
      color: var(--text-dim);
    }
    .sum.invalid {
      color: var(--warn);
    }
    .error {
      margin: 8px 0 0;
      font-size: 12px;
      color: var(--danger);
    }
    @media (max-width: 600px) {
      li {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }
      .date {
        grid-column: 2 / span 2;
      }
    }
  `,
})
export class MilestoneEditor {
  readonly milestones = model.required<readonly MilestoneDraft[]>();
  readonly structural = input(false, { transform: booleanAttribute });

  protected readonly nameMaxLength = MILESTONE_NAME_MAX_LENGTH;
  protected readonly weightTotal = MILESTONE_WEIGHT_TOTAL;
  protected readonly percent = formatPercent;

  protected readonly sum = computed(() => milestoneWeightSum(this.milestones()));
  protected readonly derived = computed(() => derivedProgressPercent(this.milestones()));
  protected readonly error = computed(() => milestoneTableError(this.milestones()));

  protected toggle(index: number, event: Event): void {
    const achieved = (event.target as HTMLInputElement).checked;
    // Desmarcar un hito retira también su fecha: el servidor no admite fecha sin cumplimiento.
    this.patch(index, (draft) => ({
      ...draft,
      achieved,
      achievedOn: achieved ? draft.achievedOn : '',
    }));
  }

  protected rename(index: number, event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.patch(index, (draft) => ({ ...draft, name }));
  }

  protected reweigh(index: number, event: Event): void {
    const weightPercent = Number((event.target as HTMLInputElement).value);
    this.patch(index, (draft) => ({ ...draft, weightPercent }));
  }

  protected redate(index: number, event: Event): void {
    const achievedOn = (event.target as HTMLInputElement).value;
    this.patch(index, (draft) => ({ ...draft, achievedOn }));
  }

  protected add(): void {
    this.milestones.update((drafts) => [...drafts, EMPTY_MILESTONE]);
  }

  protected remove(index: number): void {
    this.milestones.update((drafts) => drafts.filter((_, position) => position !== index));
  }

  private patch(index: number, change: (draft: MilestoneDraft) => MilestoneDraft): void {
    this.milestones.update((drafts) =>
      drafts.map((draft, position) => (position === index ? change(draft) : draft)),
    );
  }
}
