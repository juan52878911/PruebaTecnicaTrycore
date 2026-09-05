import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MeasurementPoint } from '../../core/api/models/measurement';
import { formatMoneyRounded, formatShortDate } from '../../core/format/evm-format';

const FULL_PERCENT = 100;
const MAX_GROUPS = 8;

/**
 * Comparativa de PV, EV y AC corte a corte, en barras agrupadas.
 *
 * La curva S muestra la tendencia acumulada; esta vista deja ver la distancia entre las tres
 * series en cada corte, que es lo que cuesta leer en un gráfico de líneas superpuestas.
 *
 * Comparten una escala única. Escalar cada serie a su propio máximo haría que todas las barras
 * llegaran arriba y la comparación dejaría de significar nada.
 */
@Component({
  selector: 'app-grouped-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend">
      <span class="entry"><span class="chip pv"></span>{{ plannedLabel() }}</span>
      <span class="entry"><span class="chip ev"></span>{{ earnedLabel() }}</span>
      <span class="entry"><span class="chip ac"></span>{{ actualCostLabel() }}</span>
    </div>

    <div class="plot" role="img" [attr.aria-label]="accessibleSummary()">
      @for (group of groups(); track group.cutoffDate) {
        <div class="group">
          <div class="bars">
            <span
              class="bar pv"
              [style.height.%]="group.plannedHeight"
              [attr.title]="group.plannedText"
            ></span>
            <span
              class="bar ev"
              [style.height.%]="group.earnedHeight"
              [attr.title]="group.earnedText"
            ></span>
            <span
              class="bar ac"
              [style.height.%]="group.costHeight"
              [attr.title]="group.costText"
            ></span>
          </div>
          <span class="tick">{{ group.label }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .entry {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .chip {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .chip.pv,
    .bar.pv {
      background: var(--pv);
    }
    .chip.ev,
    .bar.ev {
      background: var(--accent);
    }
    .chip.ac,
    .bar.ac {
      background: var(--ac);
    }
    .plot {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      height: 230px;
    }
    .group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
      border-radius: 10px;
      padding: 4px;
      transition: background var(--motion-veil);
    }
    .group:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      width: 100%;
      min-height: 0;
    }
    .bar {
      flex: 1;
      border-radius: 8px 8px 3px 3px;
      min-height: 2px;
      transform-origin: bottom center;
      transition: height 400ms cubic-bezier(0.4, 0, 0.2, 1);
      animation: valora-grow 600ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    @keyframes valora-grow {
      from {
        transform: scaleY(0);
      }
      to {
        transform: scaleY(1);
      }
    }
    .tick {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      white-space: nowrap;
    }
  `,
})
export class GroupedBars {
  readonly points = input.required<readonly MeasurementPoint[]>();
  readonly plannedLabel = input('PV');
  readonly earnedLabel = input('EV');
  readonly actualCostLabel = input('AC');

  /** Con muchos cortes las barras se vuelven ilegibles; se muestran los más recientes. */
  private readonly visible = computed(() => this.points().slice(-MAX_GROUPS));

  private readonly scale = computed(() => {
    const values = this.visible().flatMap((point) => [
      point.totals.plannedValue,
      point.totals.earnedValue,
      point.totals.actualCost,
    ]);
    const highest = values.length === 0 ? 0 : Math.max(...values);
    return highest === 0 ? 1 : highest;
  });

  protected readonly groups = computed(() => {
    const scale = this.scale();
    const height = (value: number): number =>
      Math.min(FULL_PERCENT, (value / scale) * FULL_PERCENT);
    return this.visible().map((point) => ({
      cutoffDate: point.cutoffDate,
      label: formatShortDate(point.cutoffDate),
      plannedHeight: height(point.totals.plannedValue),
      earnedHeight: height(point.totals.earnedValue),
      costHeight: height(point.totals.actualCost),
      plannedText: `${this.plannedLabel()} ${formatMoneyRounded(point.totals.plannedValue)}`,
      earnedText: `${this.earnedLabel()} ${formatMoneyRounded(point.totals.earnedValue)}`,
      costText: `${this.actualCostLabel()} ${formatMoneyRounded(point.totals.actualCost)}`,
    }));
  });

  protected readonly accessibleSummary = computed(() => {
    const groups = this.groups();
    if (groups.length === 0) {
      return 'Sin cortes que comparar';
    }
    return `Comparativa por corte, ${groups.length} cortes. ${groups
      .map(
        (group) => `${group.label}: ${group.plannedText}, ${group.earnedText}, ${group.costText}`,
      )
      .join('. ')}.`;
  });
}
