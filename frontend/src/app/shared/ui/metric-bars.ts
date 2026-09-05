import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatMoneyRounded } from '../../core/format/evm-format';

const FULL_PERCENT = 100;

export interface MetricBar {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

/** Comparativa de PV, EV y AC en barras horizontales sobre una escala común. */
@Component({
  selector: 'app-metric-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="bars">
      @for (bar of scaled(); track bar.label) {
        <li>
          <div class="head">
            <span class="label">{{ bar.label }}</span>
            <span class="value tabular">{{ bar.text }}</span>
          </div>
          <div class="track" role="img" [attr.aria-label]="bar.label + ': ' + bar.text">
            <div class="fill" [style.width.%]="bar.width" [style.background]="bar.color"></div>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .bars {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .value {
      font-size: 14px;
      font-weight: 700;
    }
    .track {
      height: 9px;
      border-radius: 9px;
      background: var(--border-card);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: 9px;
      transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
    }
  `,
})
export class MetricBars {
  readonly bars = input.required<readonly MetricBar[]>();
  /**
   * Referencia de la escala, normalmente el presupuesto de la actividad.
   *
   * Si no se pasa, se usa el mayor de los valores. Compartir escala es lo que hace comparables las
   * tres barras: escalar cada una a su propio máximo las haría todas del mismo largo.
   */
  readonly reference = input<number | null>(null);

  protected readonly scaled = computed(() => {
    const bars = this.bars();
    const explicit = this.reference();
    const highest = bars.length === 0 ? 0 : Math.max(...bars.map((bar) => bar.value));
    const scale = explicit !== null && explicit > 0 ? explicit : highest;
    return bars.map((bar) => ({
      ...bar,
      text: formatMoneyRounded(bar.value),
      width: scale <= 0 ? 0 : Math.min(FULL_PERCENT, (bar.value / scale) * FULL_PERCENT),
    }));
  });
}
