import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { UndefinedIndicator } from '../../core/api/models/evm';
import { formatIndex, UNDEFINED_INDICATOR_LABEL } from '../../core/format/evm-format';
import { Tone } from '../../core/status/status-tone';

/**
 * Valor de un índice, con su color.
 *
 * Encapsula la única regla que no se puede olvidar en ningún sitio: un índice indefinido se
 * rotula `N/A`, y uno que vale cero se pinta como cero.
 */
@Component({
  selector: 'app-index-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="value" [class]="'tone-' + tone()" [attr.title]="hint()">{{
    text()
  }}</span>`,
  styles: `
    .value {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
  `,
})
export class IndexValue {
  readonly value = input.required<UndefinedIndicator>();
  readonly tone = input<Tone>('neutral');
  readonly hint = input<string | null>(null);

  protected readonly text = computed(() => formatIndex(this.value()));
  protected readonly undefinedLabel = UNDEFINED_INDICATOR_LABEL;
}
