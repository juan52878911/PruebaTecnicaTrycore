import {
  CURRENCY_VALUES,
  DATE_FORMAT_VALUES,
  DEFAULT_PREFERENCES,
  INDICATOR_NAMING_VALUES,
  Preferences,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from './preferences.model';

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function threshold(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value >= THRESHOLD_MIN && value <= THRESHOLD_MAX ? value : fallback;
}

/**
 * Reconstruye las preferencias a partir de lo guardado.
 *
 * Valida campo a campo y cae al valor por defecto solo del campo inválido, nunca del objeto
 * entero: lo guardado puede estar corrupto, venir de una versión anterior o haberse editado a
 * mano desde las herramientas del navegador, y perder los siete ajustes buenos por uno malo
 * sería una sorpresa desagradable.
 */
export function parsePreferences(raw: string | null): Preferences {
  if (raw === null) {
    return DEFAULT_PREFERENCES;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PREFERENCES;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_PREFERENCES;
  }

  const stored = parsed as Record<string, unknown>;
  return {
    indicatorNaming: oneOf(
      stored['indicatorNaming'],
      INDICATOR_NAMING_VALUES,
      DEFAULT_PREFERENCES.indicatorNaming,
    ),
    showInterpretation: boolean(
      stored['showInterpretation'],
      DEFAULT_PREFERENCES.showInterpretation,
    ),
    autoRefreshAfterSave: boolean(
      stored['autoRefreshAfterSave'],
      DEFAULT_PREFERENCES.autoRefreshAfterSave,
    ),
    warningThreshold: threshold(stored['warningThreshold'], DEFAULT_PREFERENCES.warningThreshold),
    criticalThreshold: threshold(
      stored['criticalThreshold'],
      DEFAULT_PREFERENCES.criticalThreshold,
    ),
    currencyCode: oneOf(stored['currencyCode'], CURRENCY_VALUES, DEFAULT_PREFERENCES.currencyCode),
    dateFormat: oneOf(stored['dateFormat'], DATE_FORMAT_VALUES, DEFAULT_PREFERENCES.dateFormat),
  };
}
