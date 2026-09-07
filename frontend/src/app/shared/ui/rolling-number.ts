import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';

const DIGITS = '0123456789';
/** Paso inicial del rodado; los siguientes se alargan para que la cifra frene al asentarse. */
const FIRST_STEP_MS = 26;
const STEP_GROWTH_MS = 4;
const STEPS_PER_DIGIT = 2;
const RADIX = 10;

/**
 * Cifra que rueda de la forma abreviada al valor exacto al pasar el cursor, y de vuelta al salir.
 *
 * Es el gesto que el diseño usa para no sacrificar precisión por espacio: la tarjeta muestra
 * `1,12 M`, y quien necesita el dato al peso lo obtiene sin abrir nada. Los dígitos se van fijando
 * de izquierda a derecha, uno cada dos pasos, y los que aún no lo están giran al azar. Cada paso
 * dura un poco más que el anterior, así que el rodado frena al final en lugar de cortarse en seco.
 *
 * Reserva desde el principio el ancho de la cifra completa, con una copia invisible: nada de lo
 * que hay al lado se mueve cuando la cifra crece o encoge.
 *
 * Solo se instancia cuando la abreviatura oculta algo: si el valor completo ya cabe, es texto plano
 * y no hay nada que rodar.
 */
@Component({
  selector: 'app-rolling-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mouseenter)': 'reveal()',
    '(mouseleave)': 'conceal()',
    '(focus)': 'reveal()',
    '(blur)': 'conceal()',
    '[attr.tabindex]': 'rolls() ? 0 : null',
    '[class.rolling]': 'rolling()',
  },
  template: `
    <span class="visible">{{ text() }}</span>
    <span class="ghost" aria-hidden="true">{{ exact() }}</span>
  `,
  styles: `
    :host {
      display: inline-grid;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      user-select: none;
      cursor: default;
    }
    .visible,
    .ghost {
      grid-area: 1 / 1;
    }
    .ghost {
      visibility: hidden;
    }
    :host(.rolling) {
      user-select: text;
      cursor: text;
    }
  `,
})
export class RollingNumber {
  /** Forma abreviada que se ve en reposo. */
  readonly short = input.required<string>();
  /** Valor exacto al que rueda. */
  readonly exact = input.required<string>();

  private readonly rolled = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly rolls = computed(() => this.short() !== this.exact());
  protected readonly rolling = computed(() => this.rolled() !== null);
  protected readonly text = computed(() => this.rolled() ?? this.short());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  protected reveal(): void {
    if (this.rolls()) {
      this.rollTo(this.exact(), () => this.rolled.set(this.exact()));
    }
  }

  protected conceal(): void {
    if (this.rolls() && this.rolled() !== null) {
      this.rollTo(this.short(), () => this.rolled.set(null));
    }
  }

  /** Fija los dígitos de izquierda a derecha con pasos cada vez más largos, y avisa al llegar. */
  private rollTo(target: string, settle: () => void): void {
    this.clear();
    let step = 0;
    const tick = (): void => {
      step += 1;
      const settled = Math.floor(step / STEPS_PER_DIGIT);
      if (settled >= target.length) {
        this.timer = null;
        settle();
        return;
      }
      this.rolled.set(
        [...target]
          .map((character, index) =>
            index < settled || !/\d/.test(character)
              ? character
              : (DIGITS[Math.floor(Math.random() * RADIX)] ?? character),
          )
          .join(''),
      );
      this.timer = setTimeout(tick, FIRST_STEP_MS + step * STEP_GROWTH_MS);
    };
    this.timer = setTimeout(tick, FIRST_STEP_MS);
  }

  private clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
