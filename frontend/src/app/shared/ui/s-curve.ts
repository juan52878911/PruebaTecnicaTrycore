import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { MeasurementPoint } from '../../core/api/models/measurement';
import { formatCompact, formatShortDate } from '../../core/format/evm-format';

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 210;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 22;
const GRID_LINES = 4;
const MAX_AXIS_LABELS = 6;

interface Series {
  readonly key: 'pv' | 'ev' | 'ac';
  readonly label: string;
  readonly color: string;
  readonly line: string;
  readonly area: string | null;
  readonly lastPoint: { readonly x: number; readonly y: number } | null;
}

/**
 * Curva S acumulada: valor planificado, valor ganado y costo real a lo largo de los cortes.
 *
 * Los puntos son los que devuelve `GET /projects/{id}/timeline`, uno por corte registrado. No se
 * interpola ni se inventa ningún tramo: si el proyecto solo tiene dos cortes, la gráfica tiene dos
 * puntos. Un dato que no se ha medido no se dibuja.
 *
 * El SVG se escribe a mano en lugar de traer una librería de gráficas: son tres polilíneas y un
 * área, y una dependencia de ese tamaño no se justifica para esto.
 */
@Component({
  selector: 'app-s-curve',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend">
      @for (series of series(); track series.key) {
        <span class="entry">
          <span class="dash" [style.background]="series.color"></span>
          {{ series.label }}
        </span>
      }
    </div>

    <svg
      class="chart"
      [attr.viewBox]="'0 0 ' + viewWidth + ' ' + viewHeight"
      preserveAspectRatio="none"
      role="img"
      [attr.aria-label]="accessibleSummary()"
    >
      <defs>
        <linearGradient id="valora-ev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8B6FE0" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#8B6FE0" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <g stroke="rgba(255,255,255,.06)" stroke-width="1">
        @for (line of gridLines(); track line) {
          <line x1="0" [attr.y1]="line" [attr.x2]="viewWidth" [attr.y2]="line" />
        }
      </g>

      @for (series of series(); track series.key) {
        @if (series.area) {
          <path [attr.d]="series.area" fill="url(#valora-ev-fill)" />
        }
        <path
          [attr.d]="series.line"
          fill="none"
          [attr.stroke]="series.color"
          [attr.stroke-width]="series.key === 'ev' ? 3 : 2.2"
          [attr.stroke-dasharray]="series.key === 'pv' ? '5 5' : null"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        @if (series.lastPoint) {
          <circle
            [attr.cx]="series.lastPoint.x"
            [attr.cy]="series.lastPoint.y"
            r="4.5"
            [attr.fill]="series.color"
            stroke="#0B0B0C"
            stroke-width="2.5"
          />
        }
      }
    </svg>

    <div class="axis">
      @for (label of axisLabels(); track label) {
        <span>{{ label }}</span>
      }
    </div>
  `,
  styles: `
    .legend {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .entry {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .dash {
      width: 16px;
      height: 3px;
      border-radius: 9px;
    }
    .chart {
      width: 100%;
      height: 236px;
      display: block;
    }
    .axis {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dim);
    }
  `,
})
export class SCurve {
  readonly points = input.required<readonly MeasurementPoint[]>();
  readonly plannedLabel = input('PV');
  readonly earnedLabel = input('EV');
  readonly actualCostLabel = input('AC');

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewHeight = VIEW_HEIGHT;

  protected readonly gridLines = computed(() =>
    Array.from({ length: GRID_LINES }, (_, index) => {
      const usable = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
      return PADDING_TOP + (usable / GRID_LINES) * (index + 1);
    }),
  );

  /**
   * Escala vertical común a las tres series.
   *
   * Comparten eje a propósito: la lectura de la curva S es cuánto se separan entre sí, y con
   * escalas independientes esa distancia dejaría de significar nada.
   */
  private readonly maxValue = computed(() => {
    const values = this.points().flatMap((point) => [
      point.totals.plannedValue,
      point.totals.earnedValue,
      point.totals.actualCost,
    ]);
    const highest = values.length === 0 ? 0 : Math.max(...values);
    return highest === 0 ? 1 : highest;
  });

  protected readonly series = computed<readonly Series[]>(() => {
    const points = this.points();
    if (points.length === 0) {
      return [];
    }
    return [
      this.buildSeries('pv', this.plannedLabel(), '#61616D', (p) => p.totals.plannedValue, false),
      this.buildSeries('ev', this.earnedLabel(), '#8B6FE0', (p) => p.totals.earnedValue, true),
      this.buildSeries('ac', this.actualCostLabel(), '#C4BC72', (p) => p.totals.actualCost, false),
    ];
  });

  protected readonly axisLabels = computed(() => {
    const dates = this.points().map((point) => formatShortDate(point.cutoffDate));
    if (dates.length <= MAX_AXIS_LABELS) {
      return dates;
    }
    // Con muchos cortes las etiquetas se solaparían; se muestra una de cada n, incluida la última.
    const step = Math.ceil(dates.length / MAX_AXIS_LABELS);
    return dates.filter((_, index) => index % step === 0 || index === dates.length - 1);
  });

  protected readonly accessibleSummary = computed(() => {
    const points = this.points();
    const last = points.at(-1);
    if (last === undefined) {
      return 'Curva S sin datos';
    }
    const cuts = points.length === 1 ? '1 corte' : `${points.length} cortes`;
    return (
      `Curva S con ${cuts}. En el último, ` +
      `${this.plannedLabel()} ${formatCompact(last.totals.plannedValue)}, ` +
      `${this.earnedLabel()} ${formatCompact(last.totals.earnedValue)}, ` +
      `${this.actualCostLabel()} ${formatCompact(last.totals.actualCost)}.`
    );
  });

  private buildSeries(
    key: Series['key'],
    label: string,
    color: string,
    pick: (point: MeasurementPoint) => number,
    withArea: boolean,
  ): Series {
    const points = this.points();
    const coordinates = points.map((point, index) => ({
      x: this.xAt(index, points.length),
      y: this.yAt(pick(point)),
    }));

    const line = coordinates
      .map((coordinate, index) => `${index === 0 ? 'M' : 'L'}${coordinate.x} ${coordinate.y}`)
      .join(' ');
    const baseline = VIEW_HEIGHT - PADDING_BOTTOM;
    const first = coordinates[0];
    const last = coordinates.at(-1);
    const area =
      withArea && first !== undefined && last !== undefined
        ? `${line} L${last.x} ${baseline} L${first.x} ${baseline} Z`
        : null;

    return { key, label, color, line, area, lastPoint: last ?? null };
  }

  private xAt(index: number, total: number): number {
    // Un solo corte se dibuja en el centro: pegarlo al borde izquierdo se leería como un error.
    return total <= 1 ? VIEW_WIDTH / 2 : (index / (total - 1)) * VIEW_WIDTH;
  }

  private yAt(value: number): number {
    const usable = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    return VIEW_HEIGHT - PADDING_BOTTOM - (value / this.maxValue()) * usable;
  }
}
