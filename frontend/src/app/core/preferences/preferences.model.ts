/** Cómo se rotulan los indicadores en toda la interfaz. */
export type IndicatorNaming = 'siglas' | 'claro';

export type CurrencyCode = 'USD' | 'COP' | 'EUR';

export type DateFormat = 'DD MMM AAAA' | 'AAAA-MM-DD';

/** Fórmula titular con la que se piden el EAC y el VAC al servidor. */
export type EacFormula = 'BAC_OVER_CPI' | 'AC_PLUS_REMAINING' | 'AC_PLUS_REMAINING_OVER_CPI_SPI';

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
  /**
   * Fórmula titular del costo al cierre. Viaja al servidor como parámetro de consulta: el cálculo
   * lo sigue haciendo él, aquí solo se elige cuál de los tres supuestos se muestra en primer plano.
   */
  readonly eacFormula: EacFormula;
  /** Rótulo de moneda. No convierte importes: el backend guarda decimales sin divisa. */
  readonly currencyCode: CurrencyCode;
  readonly dateFormat: DateFormat;
}

export const DEFAULT_PREFERENCES: Preferences = {
  indicatorNaming: 'siglas',
  showInterpretation: true,
  autoRefreshAfterSave: true,
  eacFormula: 'BAC_OVER_CPI',
  currencyCode: 'USD',
  dateFormat: 'DD MMM AAAA',
};

export const INDICATOR_NAMING_VALUES: readonly IndicatorNaming[] = ['siglas', 'claro'];
export const CURRENCY_VALUES: readonly CurrencyCode[] = ['USD', 'COP', 'EUR'];
export const DATE_FORMAT_VALUES: readonly DateFormat[] = ['DD MMM AAAA', 'AAAA-MM-DD'];
export const EAC_FORMULA_VALUES: readonly EacFormula[] = [
  'BAC_OVER_CPI',
  'AC_PLUS_REMAINING',
  'AC_PLUS_REMAINING_OVER_CPI_SPI',
];

/**
 * Clave del almacenamiento, con versión.
 *
 * Sube a v2 porque los umbrales de tolerancia dejaron de ser una preferencia del cliente: ahora los
 * fija el servidor y viajan en cada respuesta. Lo guardado con la forma antigua se ignora en bloque
 * en lugar de interpretarse mal.
 */
export const PREFERENCES_STORAGE_KEY = 'valora.preferences.v2';
