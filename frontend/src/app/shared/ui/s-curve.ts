import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

import { MeasurementPoint } from '../../core/api/models/measurement';
import { formatCompact, formatIndex, formatMonth } from '../../core/format/evm-format';

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 210;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 22;
const GRID_LINES = 4;
const HALF = 2;
const COMPACT_AXIS_LABELS = 5;
const HEADROOM = 1.12;

interface Coordinate {
  readonly x: number;
  readonly y: number;
}

interface Series {
  readonly key: 'pv' | 'ev' | 'ac';
  readonly label: string;
  readonly color: string;
  readonly dashed: boolean;
  readonly width: number;
  readonly line: string;
  readonly area: string | null;
  readonly last: Coordinate | null;
}

interface HoverPoint {
  readonly index: number;
  readonly x: number;
  readonly monthLabel: string;
  readonly earnedValue: string;
  readonly costIndex: string;
  readonly scheduleIndex: string;
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
    <div class="head" [class.compact]="compact()">
      <div class="summary">
        <p class="total">{{ latestEarned() }}</p>
        <p class="caption">{{ earnedLabel() }} acumulado</p>
      </div>
      <div class="legend">
        @for (series of visibleSeries(); track series.key) {
          <span class="entry">
            <span
              class="dash"
              [style.background]="series.dashed ? 'transparent' : series.color"
              [style.border-top]="series.dashed ? '2px dashed ' + series.color : 'none'"
            ></span>
            {{ series.label }}
          </span>
        }
      </div>
    </div>

    <div class="plot">
      <svg
        class="chart"
        [class.compact]="compact()"
        [attr.viewBox]="'0 0 ' + viewWidth + ' ' + viewHeight"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="accessibleSummary()"
        (pointerleave)="hoverIndex.set(null)"
      >
        <defs>
          <linearGradient id="valora-ev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8B6FE0" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#8B6FE0" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <g stroke="rgba(255,255,255,.06)" stroke-width="1">
          @for (line of gridLines(); track line) {
            <line x1="0" [attr.y1]="line" [attr.x2]="viewWidth" [attr.y2]="line" />
          }
        </g>

        @for (series of visibleSeries(); track series.key) {
          @if (series.area) {
            <path class="area" [attr.d]="series.area" fill="url(#valora-ev-fill)" />
          }
          <path
            class="line"
            [attr.d]="series.line"
            fill="none"
            [attr.stroke]="series.color"
            [attr.stroke-width]="series.width"
            [attr.stroke-dasharray]="series.dashed ? '6 6' : null"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }

        @if (active(); as point) {
          <line
            [attr.x1]="point.x"
            [attr.y1]="paddingTop"
            [attr.x2]="point.x"
            [attr.y2]="baseline"
            stroke="rgba(139,111,224,.35)"
            stroke-width="1.5"
            stroke-dasharray="2 3"
          />
        }

        @for (series of visibleSeries(); track series.key) {
          @if (series.last) {
            <circle
              [attr.cx]="series.last.x"
              [attr.cy]="series.last.y"
              r="4.5"
              [attr.fill]="series.color"
              stroke="#0B0B0C"
              stroke-width="2.5"
            />
          }
        }

        <!-- Zonas de contacto: invisibles y anchas, para que apuntar a un corte no exija puntería. -->
        @for (zone of hoverZones(); track zone.index) {
          <rect
            [attr.x]="zone.x"
            y="0"
            [attr.width]="zone.width"
            [attr.height]="viewHeight"
            fill="transparent"
            (pointerenter)="hoverIndex.set(zone.index)"
          />
        }
      </svg>

      @if (active(); as point) {
        @if (!compact()) {
          <div class="tooltip" [style.left.%]="tooltipLeft(point)">
            <span class="tip-label">{{ point.monthLabel }} · {{ earnedLabel() }} ACUMULADO</span>
            <p class="tip-value">{{ point.earnedValue }}</p>
            <div class="tip-indices">
              <span class="cost">{{ costLabel() }} {{ point.costIndex }}</span>
              <span class="schedule">{{ scheduleLabel() }} {{ point.scheduleIndex }}</span>
            </div>
          </div>
        }
      }
    </div>

    <div class="axis">
      @for (label of axisLabels(); track $index) {
        <span>{{ label }}</span>
      }
    </div>
  `,
  styles: `
    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 10px;
    }
    .summary {
      flex: none;
    }
    .total {
      margin: 0;
      white-space: nowrap;
      font-size: 44px;
      line-height: 1.1;
      font-weight: 700;
      letter-spacing: -0.04em;
      font-variant-numeric: tabular-nums;
    }
    .caption {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--text-dim);
    }
    .legend {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      padding-top: 8px;
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
    .plot {
      position: relative;
    }
    .chart {
      width: 100%;
      height: 236px;
      display: block;
    }
    /* Móvil: sin el resumen (la tarjeta ya muestra la cifra), dos series y 112 px de alto. */
    .head.compact .summary {
      display: none;
    }
    .head.compact {
      margin-bottom: 10px;
    }
    .head.compact .legend {
      padding-top: 0;
      gap: 16px;
    }
    .head.compact .entry {
      font-size: 11px;
    }
    .head.compact .dash {
      width: 14px;
    }
    .chart.compact {
      height: 112px;
    }
    .area {
      animation: valora-fade 600ms ease both 200ms;
    }
    /* La curva se dibuja: el trazo entra progresivamente en lugar de aparecer de golpe. */
    .line {
      stroke-dasharray: 1400;
      stroke-dashoffset: 1400;
      animation: valora-draw 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .tooltip {
      position: absolute;
      top: 18%;
      transform: translateX(-50%);
      min-width: 150px;
      background: rgba(27, 27, 30, 0.92);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 10px 13px;
      pointer-events: none;
      animation: valora-fade 180ms ease both;
    }
    .tip-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    .tip-value {
      margin: 6px 0 0;
      font-size: 16px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tip-indices {
      display: flex;
      gap: 12px;
      margin-top: 6px;
      font-size: 11.5px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .cost {
      color: var(--danger);
    }
    .schedule {
      color: var(--warning);
    }
    .axis {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dim);
    }
    @keyframes valora-draw {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes valora-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .line {
        stroke-dasharray: none;
        stroke-dashoffset: 0;
        animation: none;
      }
    }
  `,
})
export class SCurve {
  readonly points = input.required<readonly MeasurementPoint[]>();
  readonly plannedLabel = input('PV');
  readonly earnedLabel = input('EV');
  readonly actualCostLabel = input('AC');
  readonly costLabel = input('CPI');
  readonly scheduleLabel = input('SPI');
  /** Versión de móvil del diseño: solo planificado y ganado, más baja y sin resumen propio. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewHeight = VIEW_HEIGHT;
  protected readonly paddingTop = PADDING_TOP;
  protected readonly baseline = VIEW_HEIGHT - PADDING_BOTTOM;

  protected readonly hoverIndex = signal<number | null>(null);

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
    // Un margen sobre el máximo evita que las series se peguen al borde superior y el área acabe
    // cubriendo la tarjeta entera, que es lo que pasaba con proyectos de pocos cortes y cifras
    // parecidas entre sí.
    return highest === 0 ? 1 : highest * HEADROOM;
  });

  protected readonly series = computed<readonly Series[]>(() => {
    if (this.points().length === 0) {
      return [];
    }
    return [
      this.buildSeries('pv', this.plannedLabel(), '#8E8E9C', (p) => p.totals.plannedValue, {
        dashed: true,
        width: 2.2,
      }),
      this.buildSeries('ev', this.earnedLabel(), '#8B6FE0', (p) => p.totals.earnedValue, {
        width: 3,
        area: true,
      }),
      this.buildSeries('ac', this.actualCostLabel(), '#C4BC72', (p) => p.totals.actualCost, {
        width: 2.4,
      }),
    ];
  });

  /** En compacto el costo real no se dibuja: el artboard móvil compara solo plan y ganado. */
  protected readonly visibleSeries = computed(() =>
    this.compact() ? this.series().filter((series) => series.key !== 'ac') : this.series(),
  );

  protected readonly latestEarned = computed(() => {
    const last = this.points().at(-1);
    return last === undefined ? '—' : formatCompact(last.totals.earnedValue);
  });

  /**
   * Etiquetas de mes, como en el diseño: una por corte en escritorio y, en móvil, cinco repartidas
   * por el eje, porque con un corte al mes no caben todas en 335 px.
   */
  protected readonly axisLabels = computed(() => {
    // Varios cortes en el mismo mes no repiten la etiqueta: se rotula el primero y el resto queda
    // en blanco, conservando su sitio en el eje.
    const labels = this.points()
      .map((point) => formatMonth(point.cutoffDate))
      .map((label, index, all) => (index > 0 && all[index - 1] === label ? '' : label));
    if (!this.compact() || labels.length <= COMPACT_AXIS_LABELS) {
      return labels;
    }
    const step = (labels.length - 1) / (COMPACT_AXIS_LABELS - 1);
    return Array.from(
      { length: COMPACT_AXIS_LABELS },
      (_, index) => labels[Math.round(index * step)] ?? '',
    );
  });

  protected readonly hoverZones = computed(() => {
    const total = this.points().length;
    if (total === 0) {
      return [];
    }
    const width = VIEW_WIDTH / total;
    return this.points().map((_, index) => ({ index, x: index * width, width }));
  });

  /** El corte señalado. Sin puntero sobre la gráfica no hay ficha: la cifra ya está en la cabecera. */
  protected readonly active = computed<HoverPoint | null>(() => {
    const points = this.points();
    const index = this.hoverIndex();
    if (index === null) {
      return null;
    }
    const point = points[index];
    if (point === undefined) {
      return null;
    }
    return {
      index,
      x: this.xAt(index, points.length),
      monthLabel: formatMonth(point.cutoffDate).toUpperCase(),
      earnedValue: formatCompact(point.totals.earnedValue),
      costIndex: formatIndex(point.indicators.costPerformanceIndex),
      scheduleIndex: formatIndex(point.indicators.schedulePerformanceIndex),
    };
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

  /** Mantiene el globo dentro del lienzo cuando el corte señalado está en un extremo. */
  protected tooltipLeft(point: HoverPoint): number {
    const percent = (point.x / VIEW_WIDTH) * 100;
    return Math.min(84, Math.max(16, percent));
  }

  private buildSeries(
    key: Series['key'],
    label: string,
    color: string,
    pick: (point: MeasurementPoint) => number,
    options: { readonly dashed?: boolean; readonly width: number; readonly area?: boolean },
  ): Series {
    const points = this.points();
    const coordinates = points.map((point, index) => ({
      x: this.xAt(index, points.length),
      y: this.yAt(pick(point)),
    }));

    const line = this.smoothPath(coordinates);
    const baseline = VIEW_HEIGHT - PADDING_BOTTOM;
    const first = coordinates[0];
    const last = coordinates.at(-1);
    const area =
      options.area === true && first !== undefined && last !== undefined
        ? `${line} L${last.x} ${baseline} L${first.x} ${baseline} Z`
        : null;

    return {
      key,
      label,
      color,
      dashed: options.dashed === true,
      width: options.width,
      line,
      area,
      last: last ?? null,
    };
  }

  /**
   * Traza la polilínea con curvas suaves.
   *
   * Los puntos de control se colocan en la vertical de cada extremo del tramo, así que la curva
   * pasa exactamente por cada corte medido: suaviza el trazo sin desplazar ningún dato.
   */
  private smoothPath(coordinates: readonly Coordinate[]): string {
    const first = coordinates[0];
    if (first === undefined) {
      return '';
    }
    let path = `M${first.x} ${first.y}`;
    for (let index = 1; index < coordinates.length; index += 1) {
      const previous = coordinates[index - 1];
      const current = coordinates[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      const midpoint = (previous.x + current.x) / HALF;
      path += ` C${midpoint} ${previous.y} ${midpoint} ${current.y} ${current.x} ${current.y}`;
    }
    return path;
  }

  private xAt(index: number, total: number): number {
    // Un solo corte se dibuja en el centro: pegarlo al borde izquierdo se leería como un error.
    return total <= 1 ? VIEW_WIDTH / HALF : (index / (total - 1)) * VIEW_WIDTH;
  }

  private yAt(value: number): number {
    const usable = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    return VIEW_HEIGHT - PADDING_BOTTOM - (value / this.maxValue()) * usable;
  }
}
