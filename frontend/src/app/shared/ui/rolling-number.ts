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
const STEP_MS = 34;
const STEPS_PER_DIGIT = 2;
const RADIX = 10;

/**
 * Cifra que rueda de la forma abreviada al valor exacto al pasar el cursor.
 *
 * Es el gesto que el diseño usa para no sacrificar precisión por espacio: la tarjeta muestra
 * `1,12 M`, y quien necesita el dato al peso lo obtiene sin abrir nada. Los dígitos se van fijando
 * de izquierda a derecha, uno cada dos pasos, y los que aún no lo están giran al azar.
 *
 * Solo se instancia cuando la abreviatura oculta algo: si el valor completo ya cabe, es texto plano
 * y no hay nada que rodar.
 */
@Component({
  selector: 'app-rolling-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(mouseenter)': 'start()',
    '(mouseleave)': 'stop()',
    '(focus)': 'start()',
    '(blur)': 'stop()',
    '[attr.tabindex]': 'rolls() ? 0 : null',
    '[class.rolling]': 'rolling()',
  },
  template: `{{ text() }}`,
  styles: `
    :host {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      user-select: none;
      cursor: default;
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
  private timer: ReturnType<typeof setInterval> | null = null;

  protected readonly rolls = computed(() => this.short() !== this.exact());
  protected readonly rolling = computed(() => this.rolled() !== null);
  protected readonly text = computed(() => this.rolled() ?? this.short());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  protected start(): void {
    if (!this.rolls() || this.timer !== null) {
      return;
    }
    const target = this.exact();
    let step = 0;
    this.rolled.set(target);
    this.timer = setInterval(() => {
      step += 1;
      const settled = Math.floor(step / STEPS_PER_DIGIT);
      if (settled >= target.length) {
        this.clear();
        this.rolled.set(target);
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
    }, STEP_MS);
  }

  protected stop(): void {
    this.clear();
    this.rolled.set(null);
  }

  private clear(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
