import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { UndefinedIndicator } from '../../core/api/models/evm';
import { formatIndex, isDefinedIndicator } from '../../core/format/evm-format';
import { Tone } from '../../core/status/status-tone';

/**
 * Escala de la barra del índice.
 *
 * El uno, que es el punto de equilibrio, cae en el 66 % del ancho, tal como lo dibuja el diseño:
 * deja sitio a la derecha para el desempeño favorable sin aplastar el desfavorable.
 */
const SCALE_MAX = 1.35;
const NEUTRAL_MARK_PERCENT = 66;
const FULL_PERCENT = 100;

/** Tarjeta de CPI o SPI: valor grande, barra con la marca del equilibrio e interpretación. */
@Component({
  selector: 'app-index-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class]="'tone-' + tone()">
      <header>
        <h3>{{ title() }}</h3>
        @if (acronym()) {
          <span class="acronym">{{ acronym() }}</span>
        }
      </header>
      <p class="figure" [class]="'tone-' + tone()">{{ text() }}</p>
      <div
        class="track"
        role="img"
        [attr.aria-label]="title() + ': ' + text() + '. Equilibrio en 1,00.'"
      >
        <div class="fill" [class]="'tone-' + tone()" [style.width.%]="fillWidth()"></div>
        <span class="mark"></span>
      </div>
      <p class="reading">
        <span class="dot" [class]="'tone-' + tone()"></span>
        {{ message() }}
      </p>
    </article>
  `,
  styles: `
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: var(--pad-card);
      transition: border-color var(--motion-border);
    }
    .card.tone-danger {
      background: linear-gradient(150deg, #1c1418, var(--card) 62%);
      border-color: rgba(255, 138, 107, 0.22);
    }
    .card.tone-warning {
      background: linear-gradient(150deg, #1a1a14, var(--card) 62%);
      border-color: rgba(231, 224, 138, 0.2);
    }
    .card.tone-success {
      background: linear-gradient(150deg, #141c17, var(--card) 62%);
      border-color: rgba(126, 224, 160, 0.2);
    }
    .card:hover {
      border-color: var(--border-hover);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .acronym {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-faint);
    }
    .figure {
      margin: 18px 0 16px;
      font-size: 48px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: -0.045em;
      font-variant-numeric: tabular-nums;
    }
    .track {
      position: relative;
      height: 6px;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.08);
      overflow: visible;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      border-radius: var(--radius-pill);
      transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .fill.tone-danger {
      background: linear-gradient(90deg, var(--danger), #ffb48f);
    }
    .fill.tone-warning {
      background: linear-gradient(90deg, var(--warning), #f3efc0);
    }
    .fill.tone-success {
      background: linear-gradient(90deg, var(--ok), #b6f0cd);
    }
    .fill.tone-neutral {
      background: var(--neutral);
    }
    .mark {
      position: absolute;
      left: 66%;
      top: -4px;
      width: 2px;
      height: 14px;
      background: rgba(255, 255, 255, 0.5);
    }
    .reading {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 16px 0 0;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.45;
      color: var(--text-muted);
    }
    .dot {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
})
export class IndexCard {
  readonly title = input.required<string>();
  readonly value = input.required<UndefinedIndicator>();
  /** Motivo redactado por el backend. */
  readonly message = input.required<string>();
  readonly tone = input<Tone>('neutral');
  readonly acronym = input<string | null>(null);

  protected readonly text = computed(() => formatIndex(this.value()));
  protected readonly fillWidth = computed(() => {
    const value = this.value();
    if (!isDefinedIndicator(value)) {
      return 0;
    }
    return Math.min(FULL_PERCENT, (value / SCALE_MAX) * FULL_PERCENT);
  });
  protected readonly neutralMark = NEUTRAL_MARK_PERCENT;
}
