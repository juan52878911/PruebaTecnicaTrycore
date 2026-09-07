const FULL_PERCENT = 100;

/**
 * Escala común para un conjunto de barras: el valor más alto ocupa el cien por cien.
 *
 * Con todos los valores a cero la escala vale uno, para que ninguna altura divida por cero.
 */
export function sharedScale(values: readonly number[]): number {
  const highest = values.length === 0 ? 0 : Math.max(...values);
  return highest === 0 ? 1 : highest;
}

/** Altura de una barra, en porcentaje de la escala común, nunca por encima del cien. */
export function barHeight(value: number, scale: number): number {
  return Math.min(FULL_PERCENT, (value / scale) * FULL_PERCENT);
}
