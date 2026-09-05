import {
  formatCompact,
  formatDate,
  formatDateRange,
  formatIndex,
  formatIndexPrecise,
  formatMoney,
  formatMoneyRounded,
  formatPercent,
  formatShortDate,
  isDefinedIndicator,
  UNDEFINED_INDICATOR_LABEL,
} from './evm-format';

describe('formato de indicadores', () => {
  it('distingue un indicador indefinido de uno que vale cero', () => {
    expect(isDefinedIndicator(null)).toBe(false);
    expect(isDefinedIndicator(0)).toBe(true);
  });

  it('rotula como N/A el indicador indefinido, nunca como cero', () => {
    expect(formatIndex(null)).toBe(UNDEFINED_INDICATOR_LABEL);
    expect(formatIndex(null)).not.toBe('0,00');
    expect(formatMoney(null)).toBe(UNDEFINED_INDICATOR_LABEL);
    expect(formatCompact(null)).toBe(UNDEFINED_INDICATOR_LABEL);
  });

  it('pinta un CPI de cero como cero, porque ese índice sí está definido', () => {
    expect(formatIndex(0)).toBe('0,00');
  });

  it('usa coma decimal en los índices', () => {
    expect(formatIndex(0.8883)).toBe('0,89');
    expect(formatIndex(1.0533)).toBe('1,05');
  });

  it('conserva los cuatro decimales del backend en la vista de detalle', () => {
    expect(formatIndexPrecise(0.8883)).toBe('0,8883');
    expect(formatIndexPrecise(1)).toBe('1,0000');
  });
});

describe('formato de dinero', () => {
  it('separa los millares con espacio', () => {
    expect(formatMoneyRounded(1240000)).toBe('1 240 000');
    expect(formatMoneyRounded(1117500)).toBe('1 117 500');
  });

  it('usa el signo menos tipográfico, no el guion', () => {
    expect(formatMoneyRounded(-142000)).toBe('−142 000');
    expect(formatMoneyRounded(-142000).startsWith('-')).toBe(false);
  });

  it('mantiene dos decimales cuando se piden', () => {
    expect(formatMoney(1240000)).toBe('1 240 000,00');
    expect(formatMoney(571900.5)).toBe('571 900,50');
  });

  it('deja intactas las cifras de menos de mil', () => {
    expect(formatMoneyRounded(950)).toBe('950');
  });
});

describe('abreviatura de cifras grandes', () => {
  it('abrevia los millones con dos decimales', () => {
    expect(formatCompact(1117500)).toBe('1,12 M');
    expect(formatCompact(1240000)).toBe('1,24 M');
  });

  it('no abrevia por debajo del millón', () => {
    expect(formatCompact(602400)).toBe('602 400');
  });

  it('conserva el signo al abreviar', () => {
    expect(formatCompact(-2247000)).toBe('−2,25 M');
  });

  it('baja a un decimal cuando la parte entera ya es grande', () => {
    expect(formatCompact(24700000)).toBe('24,7 M');
  });
});

describe('formato de porcentajes', () => {
  it('omite los decimales cuando el valor es entero', () => {
    expect(formatPercent(45)).toBe('45 %');
  });

  it('muestra un decimal cuando lo hay', () => {
    expect(formatPercent(55.8)).toBe('55,8 %');
  });
});

describe('formato de fechas', () => {
  it('usa el mes abreviado en español por defecto', () => {
    expect(formatDate('2026-08-31')).toBe('31 ago 2026');
    expect(formatDate('2026-01-15')).toBe('15 ene 2026');
  });

  it('respeta el formato ISO cuando se elige en Ajustes', () => {
    expect(formatDate('2026-08-31', 'AAAA-MM-DD')).toBe('2026-08-31');
  });

  it('recorta la parte horaria de un instante', () => {
    expect(formatDate('2026-09-03T21:00:00Z')).toBe('03 sep 2026');
  });

  it('rotula la fecha ausente', () => {
    expect(formatDate(null)).toBe(UNDEFINED_INDICATOR_LABEL);
  });

  it('compone el rango completo de una actividad', () => {
    expect(formatDateRange('2026-01-15', '2026-04-30')).toBe('15 ene 2026 – 30 abr 2026');
  });

  it('describe el rango a medias cuando solo se conoce un extremo', () => {
    expect(formatDateRange('2026-03-05', null)).toBe('desde 05 mar 2026');
    expect(formatDateRange(null, '2026-07-15')).toBe('hasta 15 jul 2026');
  });

  it('no devuelve rango cuando no hay ninguna fecha', () => {
    expect(formatDateRange(null, null)).toBeNull();
  });

  it('abrevia la fecha para el eje de la gráfica', () => {
    expect(formatShortDate('2026-08-31')).toBe('31 ago');
  });
});
