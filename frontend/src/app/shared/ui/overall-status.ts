import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EvmIndicators } from '../../core/api/models/evm';
import { formatIndex } from '../../core/format/evm-format';
import { costLabel, overallTone } from '../../core/status/status-tone';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { inject } from '@angular/core';

/**
 * Estado general del proyecto en una palabra, con su lectura en lenguaje llano.
 *
 * Es la pieza que abre el panel en móvil: en una pantalla estrecha no caben nueve cifras, así que
 * lo primero que se ve es el veredicto, y el detalle viene después.
 */
@Component({
  selector: 'app-overall-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class]="'tone-' + tone()">
      <header>
        <div>
          <span class="kicker">Estado general</span>
          <p class="verdict" [class]="'tone-' + tone()">{{ verdict() }}</p>
        </div>
        @if (cutoffLabel()) {
          <span class="cutoff" [class]="'tone-' + tone()">{{ cutoffLabel() }}</span>
        }
      </header>
      <p class="reading">{{ reading() }}</p>
    </article>
  `,
  styles: `
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: 24px;
      padding: 20px;
    }
    .card.tone-danger {
      background: linear-gradient(150deg, #1c1418, var(--card) 65%);
      border-color: rgba(255, 138, 107, 0.22);
    }
    .card.tone-warning {
      background: linear-gradient(150deg, #1a1a14, var(--card) 65%);
      border-color: rgba(231, 224, 138, 0.2);
    }
    .card.tone-success {
      background: linear-gradient(150deg, #141c17, var(--card) 65%);
      border-color: rgba(126, 224, 160, 0.2);
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }
    .kicker {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .verdict {
      margin: 12px 0 0;
      font-size: 36px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.045em;
    }
    .cutoff {
      flex: none;
      border-radius: var(--radius-pill);
      padding: 7px 12px;
      font-size: 11.5px;
      font-weight: 700;
      white-space: nowrap;
    }
    .cutoff.tone-danger {
      background: var(--danger-soft);
    }
    .cutoff.tone-warning {
      background: var(--warning-soft);
    }
    .cutoff.tone-success {
      background: var(--ok-soft);
    }
    .cutoff.tone-neutral {
      background: var(--neutral-soft);
    }
    .reading {
      margin: 16px 0 0;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 600;
      color: var(--text-muted);
    }
  `,
})
export class OverallStatus {
  private readonly labels = inject(IndicatorLabels);

  readonly indicators = input.required<EvmIndicators>();
  /** Fecha del último corte, ya formateada. Ausente si el proyecto no tiene histórico. */
  readonly cutoffLabel = input<string | null>(null);

  protected readonly tone = computed(() => overallTone(this.indicators()));

  protected readonly verdict = computed(() => costLabel(this.indicators().costStatus.status));

  /**
   * Lectura combinada de los dos índices.
   *
   * Se construye a partir del estado que devuelve el servidor, no de un umbral propio, para que el
   * texto no pueda contradecir al distintivo.
   */
  protected readonly reading = computed(() => {
    const indicators = this.indicators();
    const cpi = indicators.costPerformanceIndex;
    const spi = indicators.schedulePerformanceIndex;

    if (cpi === null && spi === null) {
      return 'Sin costo ni avance planificado registrados: todavía no hay indicadores que interpretar.';
    }

    const cost = indicators.costStatus.status;
    const schedule = indicators.scheduleStatus.status;
    const overBudget = cost === 'OVER_BUDGET';
    const behind = schedule === 'BEHIND_SCHEDULE';

    const heads: string[] = [];
    if (cpi !== null) {
      heads.push(`${this.labels.short('CPI')} ${formatIndex(cpi)}`);
    }
    if (spi !== null) {
      heads.push(`${this.labels.short('SPI')} ${formatIndex(spi)}`);
    }
    const head = heads.join(' y ');

    if (overBudget && behind) {
      return `${head}: el proyecto gasta más y avanza menos de lo planificado.`;
    }
    if (overBudget) {
      return `${head}: el proyecto gasta más de lo que avanza, aunque el plazo se mantiene.`;
    }
    if (behind) {
      return `${head}: el costo se mantiene, pero el avance va por debajo del plan.`;
    }
    if (cost === 'NOT_APPLICABLE') {
      return `${head}: sin costo real registrado, la eficiencia en costo aún no está definida.`;
    }
    return `${head}: el proyecto va dentro de presupuesto y al día.`;
  });
}
