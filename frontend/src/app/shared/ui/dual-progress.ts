import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatPercent } from '../../core/format/evm-format';

const FULL_PERCENT = 100;

/** Barra de avance con el plan en gris y lo realmente ganado en violeta encima. */
@Component({
  selector: 'app-dual-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend">
      <span>plan {{ plannedLabel() }}</span>
      <span class="real">real {{ actualLabel() }}</span>
    </div>
    <div
      class="track"
      role="img"
      [attr.aria-label]="'Avance planificado ' + plannedLabel() + ', avance real ' + actualLabel()"
    >
      <div class="planned" [style.width.%]="plannedWidth()"></div>
      <div class="actual" [style.width.%]="actualWidth()"></div>
    </div>
  `,
  styles: `
    .legend {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      margin-bottom: 6px;
    }
    .real {
      color: var(--accent-text);
    }
    .track {
      position: relative;
      height: 8px;
      border-radius: var(--radius-pill);
      background: var(--border-control);
      overflow: hidden;
    }
    .planned,
    .actual {
      position: absolute;
      left: 0;
      border-radius: var(--radius-pill);
      transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .planned {
      top: 0;
      bottom: 0;
      background: var(--pv);
    }
    .actual {
      top: 2px;
      bottom: 2px;
      background: var(--accent);
    }
  `,
})
export class DualProgress {
  /** Porcentaje planificado, escala 0-100. */
  readonly planned = input.required<number>();
  /** Porcentaje real, escala 0-100. */
  readonly actual = input.required<number>();

  protected readonly plannedWidth = computed(() => this.clamp(this.planned()));
  protected readonly actualWidth = computed(() => this.clamp(this.actual()));
  protected readonly plannedLabel = computed(() => formatPercent(this.planned()));
  protected readonly actualLabel = computed(() => formatPercent(this.actual()));

  private clamp(value: number): number {
    return Math.min(FULL_PERCENT, Math.max(0, value));
  }
}
