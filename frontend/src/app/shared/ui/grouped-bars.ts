import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { MeasurementPoint } from '../../core/api/models/measurement';
import { formatIndex, formatMoneyRounded, formatShortDate } from '../../core/format/evm-format';
import { barHeight, sharedScale } from './bar-scale';

const MAX_GROUPS = 8;

/**
 * Comparativa de PV, EV y AC corte a corte, en barras agrupadas.
 *
 * La curva S muestra la tendencia acumulada; esta vista deja ver la distancia entre las tres
 * series en cada corte, que es lo que cuesta leer en un gráfico de líneas superpuestas.
 *
 * Comparten una escala única. Escalar cada serie a su propio máximo haría que todas las barras
 * llegaran arriba y la comparación dejaría de significar nada.
 *
 * Al apuntar un corte aparece su ficha con las tres cifras y los índices de ese día, con el mismo
 * lenguaje que la ficha de la curva S: el atributo `title` del navegador tarda en salir y solo
 * cuenta una barra.
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
      @for (group of groups(); track group.cutoffDate; let first = $first; let last = $last) {
        <div
          class="group"
          [class.hovered]="hovered() === group.cutoffDate"
          (mouseenter)="hovered.set(group.cutoffDate)"
          (mouseleave)="hovered.set(null)"
        >
          <div class="bars">
            <span class="bar pv" [style.height.%]="group.plannedHeight"></span>
            <span class="bar ev" [style.height.%]="group.earnedHeight"></span>
            <span class="bar ac" [style.height.%]="group.costHeight"></span>
          </div>
          <span class="tick">{{ group.label }}</span>
          @if (hovered() === group.cutoffDate) {
            <div class="tooltip" [class.edge-left]="first" [class.edge-right]="last">
              <span class="tip-label">Corte · {{ group.label }}</span>
              <dl>
                <div>
                  <dt><span class="chip pv"></span>{{ plannedLabel() }}</dt>
                  <dd>{{ group.plannedText }}</dd>
                </div>
                <div>
                  <dt><span class="chip ev"></span>{{ earnedLabel() }}</dt>
                  <dd>{{ group.earnedText }}</dd>
                </div>
                <div>
                  <dt><span class="chip ac"></span>{{ actualCostLabel() }}</dt>
                  <dd>{{ group.costText }}</dd>
                </div>
              </dl>
              <div class="tip-indices">
                <span>CPI {{ group.cpiText }}</span>
                <span>SPI {{ group.spiText }}</span>
              </div>
            </div>
          }
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
      position: relative;
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
    .group.hovered {
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
    .tooltip {
      position: absolute;
      top: 0;
      left: 50%;
      z-index: 2;
      transform: translateX(-50%);
      min-width: 168px;
      background: rgba(27, 27, 30, 0.94);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 10px 13px;
      pointer-events: none;
      animation: valora-fade 180ms ease both;
    }
    /* En los extremos la ficha se pega al borde en lugar de salirse de la tarjeta. */
    .tooltip.edge-left {
      left: 0;
      transform: none;
    }
    .tooltip.edge-right {
      left: auto;
      right: 0;
      transform: none;
    }
    .tip-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-dim);
      white-space: nowrap;
    }
    dl {
      margin: 8px 0 0;
      display: grid;
      gap: 5px;
    }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      font-size: 12px;
    }
    dt {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-weight: 600;
    }
    dd {
      margin: 0;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tip-indices {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--divider);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class GroupedBars {
  readonly points = input.required<readonly MeasurementPoint[]>();
  readonly plannedLabel = input('PV');
  readonly earnedLabel = input('EV');
  readonly actualCostLabel = input('AC');

  /** Corte apuntado, por su fecha; nulo cuando el cursor está fuera. */
  protected readonly hovered = signal<string | null>(null);

  /** Con muchos cortes las barras se vuelven ilegibles; se muestran los más recientes. */
  private readonly visible = computed(() => this.points().slice(-MAX_GROUPS));

  private readonly scale = computed(() =>
    sharedScale(
      this.visible().flatMap((point) => [
        point.totals.plannedValue,
        point.totals.earnedValue,
        point.totals.actualCost,
      ]),
    ),
  );

  protected readonly groups = computed(() => {
    const scale = this.scale();
    return this.visible().map((point) => ({
      cutoffDate: point.cutoffDate,
      label: formatShortDate(point.cutoffDate),
      plannedHeight: barHeight(point.totals.plannedValue, scale),
      earnedHeight: barHeight(point.totals.earnedValue, scale),
      costHeight: barHeight(point.totals.actualCost, scale),
      plannedText: formatMoneyRounded(point.totals.plannedValue),
      earnedText: formatMoneyRounded(point.totals.earnedValue),
      costText: formatMoneyRounded(point.totals.actualCost),
      cpiText: formatIndex(point.indicators.costPerformanceIndex),
      spiText: formatIndex(point.indicators.schedulePerformanceIndex),
    }));
  });

  protected readonly accessibleSummary = computed(() => {
    const groups = this.groups();
    if (groups.length === 0) {
      return 'Sin cortes que comparar';
    }
    return `Comparativa por corte, ${groups.length} cortes. ${groups
      .map(
        (group) =>
          `${group.label}: ${this.plannedLabel()} ${group.plannedText}, ${this.earnedLabel()} ${group.earnedText}, ${this.actualCostLabel()} ${group.costText}`,
      )
      .join('. ')}.`;
  });
}
