import { UndefinedIndicator } from '../api/models/evm';
import { DateFormat } from '../preferences/preferences.model';

/** Lo que se pinta cuando un indicador no está definido. Nunca un cero. */
export const UNDEFINED_INDICATOR_LABEL = 'N/A';

const INDEX_PRECISE_DECIMALS = 4;
const INDEX_DECIMALS = 2;
/* Como en el diseño: a partir de 10 un índice pierde un decimal para no partir la tarjeta. */
const LARGE_INDEX_THRESHOLD = 10;
const LARGE_INDEX_DECIMALS = 1;
const MONEY_DECIMALS = 2;
const GROUP_SIZE = 3;
const THOUSAND_SEPARATOR = ' ';
const DECIMAL_SEPARATOR = ',';
const MINUS_SIGN = '−';

const MILLION = 1_000_000;
const BILLION = 1_000_000_000;
const TRILLION = 1_000_000_000_000;
const COMPACT_SMALL_LIMIT = 10;

const MONTH_ABBREVIATIONS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** Estrecha el tipo para que el compilador exija comprobar la indefinición antes de operar. */
export function isDefinedIndicator(value: UndefinedIndicator): value is number {
  return value !== null;
}

/**
 * Formatea un número con el estilo del sistema visual: millares separados por espacio, coma
 * decimal y signo menos tipográfico (U+2212).
 *
 * Se construye a mano en lugar de delegar en `Intl.NumberFormat` porque el separador de millares
 * que devuelve depende de la configuración regional (punto, coma o espacio estrecho U+202F) y el
 * diseño lo fija en un espacio normal. Es una decisión de diseño, no una preferencia del usuario.
 */
function formatNumber(value: number, decimals: number): string {
  const rounded = Math.abs(value).toFixed(decimals);
  const [integerPart = '0', decimalPart] = rounded.split('.');

  let grouped = '';
  for (let index = integerPart.length; index > 0; index -= GROUP_SIZE) {
    const chunk = integerPart.slice(Math.max(0, index - GROUP_SIZE), index);
    grouped = grouped === '' ? chunk : `${chunk}${THOUSAND_SEPARATOR}${grouped}`;
  }

  const sign = value < 0 && Number(rounded) !== 0 ? MINUS_SIGN : '';
  return decimalPart === undefined
    ? `${sign}${grouped}`
    : `${sign}${grouped}${DECIMAL_SEPARATOR}${decimalPart}`;
}

/** Importe con dos decimales. Un valor indefinido se rotula, no se inventa. */
export function formatMoney(value: UndefinedIndicator): string {
  return isDefinedIndicator(value)
    ? formatNumber(value, MONEY_DECIMALS)
    : UNDEFINED_INDICATOR_LABEL;
}

/** Importe sin decimales, para las cifras grandes de las tarjetas del panel. */
export function formatMoneyRounded(value: UndefinedIndicator): string {
  return isDefinedIndicator(value) ? formatNumber(value, 0) : UNDEFINED_INDICATOR_LABEL;
}

/**
 * Índice de desempeño con dos decimales, como en el diseño.
 *
 * Un índice de cero SÍ está definido y se pinta como `0,00`: con avance real cero y costo
 * incurrido, el CPI vale cero y el estado es de sobrecosto. Solo `null` se convierte en `N/A`.
 */
export function formatIndex(value: UndefinedIndicator): string {
  if (!isDefinedIndicator(value)) {
    return UNDEFINED_INDICATOR_LABEL;
  }
  const decimals = Math.abs(value) < LARGE_INDEX_THRESHOLD ? INDEX_DECIMALS : LARGE_INDEX_DECIMALS;
  return formatNumber(value, decimals);
}

/** Índice con los cuatro decimales que devuelve el backend, para la vista de detalle. */
export function formatIndexPrecise(value: UndefinedIndicator): string {
  return isDefinedIndicator(value)
    ? formatNumber(value, INDEX_PRECISE_DECIMALS)
    : UNDEFINED_INDICATOR_LABEL;
}

/** Porcentaje en escala 0-100. */
export function formatPercent(value: UndefinedIndicator): string {
  if (!isDefinedIndicator(value)) {
    return UNDEFINED_INDICATOR_LABEL;
  }
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} %`;
}

/** Abreviatura para las cifras que no caben: `1 117 500` pasa a `1,12 M`. */
export function formatCompact(value: UndefinedIndicator): string {
  if (!isDefinedIndicator(value)) {
    return UNDEFINED_INDICATOR_LABEL;
  }
  const magnitude = Math.abs(value);
  if (magnitude < MILLION) {
    return formatNumber(value, 0);
  }
  const [divisor, suffix] =
    magnitude >= TRILLION
      ? [TRILLION, 'B']
      : magnitude >= BILLION
        ? [BILLION, 'MM']
        : [MILLION, 'M'];
  const scaled = value / divisor;
  const decimals = Math.abs(scaled) < COMPACT_SMALL_LIMIT ? 2 : 1;
  return `${formatNumber(scaled, decimals)} ${suffix}`;
}

/** Fecha ISO (`2026-08-31`) en el formato elegido en Ajustes. */
export function formatDate(value: string | null, format: DateFormat = 'DD MMM AAAA'): string {
  if (value === null || value === '') {
    return UNDEFINED_INDICATOR_LABEL;
  }
  const [year, month, day] = value.slice(0, 10).split('-');
  if (year === undefined || month === undefined || day === undefined) {
    return value;
  }
  if (format === 'AAAA-MM-DD') {
    return `${year}-${month}-${day}`;
  }
  const monthName = MONTH_ABBREVIATIONS[Number(month) - 1] ?? month;
  return `${day} ${monthName} ${year}`;
}

/** Solo el mes, para el eje de la curva: `ago`. */
export function formatMonth(value: string): string {
  const [, month] = value.slice(0, 10).split('-');
  if (month === undefined) {
    return value;
  }
  const name = MONTH_ABBREVIATIONS[Number(month) - 1] ?? month;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

/** Fecha corta para los ejes de la gráfica: `31 ago`. */
export function formatShortDate(value: string): string {
  const [, month, day] = value.slice(0, 10).split('-');
  if (month === undefined || day === undefined) {
    return value;
  }
  return `${day} ${MONTH_ABBREVIATIONS[Number(month) - 1] ?? month}`;
}

/** Rango de fechas de una actividad, o lo que se conozca de él. */
export function formatDateRange(
  start: string | null,
  end: string | null,
  format: DateFormat = 'DD MMM AAAA',
): string | null {
  if (start === null && end === null) {
    return null;
  }
  if (start !== null && end !== null) {
    return `${formatDate(start, format)} – ${formatDate(end, format)}`;
  }
  return start !== null ? `desde ${formatDate(start, format)}` : `hasta ${formatDate(end, format)}`;
}
