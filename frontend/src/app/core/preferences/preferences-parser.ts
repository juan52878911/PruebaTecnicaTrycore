import {
  CURRENCY_VALUES,
  DATE_FORMAT_VALUES,
  DEFAULT_PREFERENCES,
  EAC_FORMULA_VALUES,
  INDICATOR_NAMING_VALUES,
  Preferences,
} from './preferences.model';

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
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
    eacFormula: oneOf(stored['eacFormula'], EAC_FORMULA_VALUES, DEFAULT_PREFERENCES.eacFormula),
    currencyCode: oneOf(stored['currencyCode'], CURRENCY_VALUES, DEFAULT_PREFERENCES.currencyCode),
    dateFormat: oneOf(stored['dateFormat'], DATE_FORMAT_VALUES, DEFAULT_PREFERENCES.dateFormat),
  };
}
