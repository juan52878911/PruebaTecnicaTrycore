import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { UndefinedIndicator } from '../../core/api/models/evm';
import { formatCompact, formatMoneyRounded } from '../../core/format/evm-format';
import { Tone } from '../../core/status/status-tone';

/** Tarjeta de cifra: rótulo, sigla, valor grande, unidad y pie explicativo. */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <header>
        <h3>{{ title() }}</h3>
        @if (acronym()) {
          <span class="acronym">{{ acronym() }}</span>
        }
      </header>
      <p class="figure" [class]="'tone-' + tone()">
        <span class="tabular">{{ text() }}</span>
        @if (unit()) {
          <span class="unit">{{ unit() }}</span>
        }
      </p>
      @if (footnote()) {
        <p class="footnote" [class]="'tone-' + footnoteTone()">{{ footnote() }}</p>
      }
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
      margin: 16px 0 0;
      font-size: 40px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: -0.04em;
    }
    .unit {
      margin-left: 8px;
      font-size: 17px;
      font-weight: 600;
      color: var(--text-dim);
      letter-spacing: 0;
    }
    .footnote {
      margin: 12px 0 0;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-dim);
    }
    .footnote.tone-danger {
      color: var(--danger);
    }
    .footnote.tone-warning {
      color: var(--warning);
    }
    .footnote.tone-success {
      color: var(--ok);
    }
  `,
})
export class KpiCard {
  readonly title = input.required<string>();
  readonly value = input.required<UndefinedIndicator>();
  readonly acronym = input<string | null>(null);
  readonly unit = input<string | null>(null);
  readonly footnote = input<string | null>(null);
  readonly tone = input<Tone>('neutral');
  readonly footnoteTone = input<Tone>('neutral');
  /** Abrevia las cifras que no caben: `1 117 500` pasa a `1,12 M`. */
  readonly compact = input(false);

  protected readonly text = computed(() =>
    this.compact() ? formatCompact(this.value()) : formatMoneyRounded(this.value()),
  );
}
