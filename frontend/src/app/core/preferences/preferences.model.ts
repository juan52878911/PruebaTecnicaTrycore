/** Cómo se rotulan los indicadores en toda la interfaz. */
export type IndicatorNaming = 'siglas' | 'claro';

export type CurrencyCode = 'USD' | 'COP' | 'EUR';

export type DateFormat = 'DD MMM AAAA' | 'AAAA-MM-DD';

/**
 * Preferencias del usuario.
 *
 * No hay backend de configuración, así que viven en el almacenamiento del navegador. Solo
 * contiene ajustes que la interfaz puede honrar de verdad: nada que dependa del cálculo del
 * servidor entra aquí, porque un control que no cambia nada es peor que no ponerlo.
 */
export interface Preferences {
  readonly indicatorNaming: IndicatorNaming;
  /** Muestra los bloques de interpretación con el motivo que redacta el backend. */
  readonly showInterpretation: boolean;
  /** Tras guardar, recarga el consolidado; si está apagado aparece un botón de recálculo. */
  readonly autoRefreshAfterSave: boolean;
  /** Índice por debajo del cual una actividad se resalta como en riesgo. */
  readonly warningThreshold: number;
  /** Índice por debajo del cual una actividad se resalta como crítica. */
  readonly criticalThreshold: number;
  /** Rótulo de moneda. No convierte importes: el backend guarda decimales sin divisa. */
  readonly currencyCode: CurrencyCode;
  readonly dateFormat: DateFormat;
}

export const DEFAULT_PREFERENCES: Preferences = {
  indicatorNaming: 'siglas',
  showInterpretation: true,
  autoRefreshAfterSave: true,
  warningThreshold: 0.95,
  criticalThreshold: 0.8,
  currencyCode: 'USD',
  dateFormat: 'DD MMM AAAA',
};

export const INDICATOR_NAMING_VALUES: readonly IndicatorNaming[] = ['siglas', 'claro'];
export const CURRENCY_VALUES: readonly CurrencyCode[] = ['USD', 'COP', 'EUR'];
export const DATE_FORMAT_VALUES: readonly DateFormat[] = ['DD MMM AAAA', 'AAAA-MM-DD'];

/** Un índice de desempeño por debajo de 0 no significa nada y por encima de 2 no resalta nada. */
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 2;

/**
 * Clave del almacenamiento, con versión.
 *
 * Si el día de mañana cambia la forma de las preferencias, se sube la versión y las guardadas con
 * la forma antigua se ignoran en bloque en lugar de interpretarse mal.
 */
export const PREFERENCES_STORAGE_KEY = 'valora.preferences.v1';
