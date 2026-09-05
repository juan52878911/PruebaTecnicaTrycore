import { computed, inject, Injectable, Signal } from '@angular/core';

import { PreferencesStore } from '../preferences/preferences-store';
import { IndicatorNaming } from '../preferences/preferences.model';

/** Las claves de indicador que la interfaz sabe rotular. */
export type IndicatorKey = 'PV' | 'EV' | 'AC' | 'BAC' | 'CV' | 'SV' | 'CPI' | 'SPI' | 'EAC' | 'VAC';

interface LabelVariants {
  /** Rótulo grande de tarjeta. */
  readonly title: string;
  /** Etiqueta de campo o cabecera de tabla. */
  readonly short: string;
  /** La sigla dentro de una frase. */
  readonly inline: string;
}

const ACRONYMS: Record<IndicatorKey, LabelVariants> = {
  PV: { title: 'PV', short: 'PV', inline: 'PV' },
  EV: { title: 'EV', short: 'EV', inline: 'EV' },
  AC: { title: 'AC', short: 'AC', inline: 'AC' },
  BAC: { title: 'BAC', short: 'BAC', inline: 'BAC' },
  CV: { title: 'CV', short: 'CV', inline: 'CV' },
  SV: { title: 'SV', short: 'SV', inline: 'SV' },
  CPI: { title: 'CPI', short: 'CPI', inline: 'CPI' },
  SPI: { title: 'SPI', short: 'SPI', inline: 'SPI' },
  EAC: { title: 'EAC', short: 'EAC', inline: 'EAC' },
  VAC: { title: 'VAC', short: 'VAC', inline: 'VAC' },
};

const PLAIN_SPANISH: Record<IndicatorKey, LabelVariants> = {
  PV: { title: 'Valor planificado', short: 'Planificado', inline: 'valor planificado' },
  EV: { title: 'Valor ganado', short: 'Ganado', inline: 'valor ganado' },
  AC: { title: 'Costo real', short: 'Costo real', inline: 'costo real' },
  BAC: { title: 'Presupuesto base', short: 'Presupuesto', inline: 'presupuesto base' },
  CV: { title: 'Desvío en costo', short: 'Desvío costo', inline: 'desvío en costo' },
  SV: { title: 'Desvío en plazo', short: 'Desvío plazo', inline: 'desvío en plazo' },
  CPI: { title: 'Eficiencia en costo', short: 'Efic. costo', inline: 'eficiencia en costo' },
  SPI: { title: 'Eficiencia en plazo', short: 'Efic. plazo', inline: 'eficiencia en plazo' },
  EAC: { title: 'Costo al cierre', short: 'Al cierre', inline: 'costo al cierre' },
  VAC: { title: 'Desvío al cierre', short: 'Desvío cierre', inline: 'desvío al cierre' },
};

/** Fórmula de cada indicador derivado, tal y como la muestra la vista de detalle. */
export const INDICATOR_FORMULAS: Partial<Record<IndicatorKey, string>> = {
  CV: 'CV = EV − AC',
  SV: 'SV = EV − PV',
  CPI: 'CPI = EV / AC',
  SPI: 'SPI = EV / PV',
  EAC: 'EAC = BAC / CPI',
  VAC: 'VAC = BAC − EAC',
};

function dictionaryFor(naming: IndicatorNaming): Record<IndicatorKey, LabelVariants> {
  return naming === 'claro' ? PLAIN_SPANISH : ACRONYMS;
}

/**
 * Rótulos de los indicadores, en siglas del estándar o en español claro.
 *
 * Es la pieza más transversal de la interfaz: el mismo interruptor reetiqueta tablas, tarjetas y
 * formularios a la vez. Vive detrás de un servicio con signals para que el cambio se propague sin
 * recargar y sin depender de zone.js.
 */
@Injectable({ providedIn: 'root' })
export class IndicatorLabels {
  private readonly preferences = inject(PreferencesStore);

  private readonly dictionary = computed(() => dictionaryFor(this.preferences.indicatorNaming()));

  /** Indica si conviene mostrar la sigla como distintivo junto al rótulo largo. */
  readonly showAcronymBadge: Signal<boolean> = computed(
    () => this.preferences.indicatorNaming() === 'claro',
  );

  title(key: IndicatorKey): string {
    return this.dictionary()[key].title;
  }

  short(key: IndicatorKey): string {
    return this.dictionary()[key].short;
  }

  inline(key: IndicatorKey): string {
    return this.dictionary()[key].inline;
  }
}
