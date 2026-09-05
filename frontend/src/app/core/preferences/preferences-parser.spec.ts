import { parsePreferences } from './preferences-parser';
import { DEFAULT_PREFERENCES } from './preferences.model';

/**
 * Lo guardado en el navegador no es de fiar: puede estar corrupto, venir de una versión anterior
 * de la aplicación o haberse editado a mano desde las herramientas de desarrollo. El parser es
 * una función pura, así que estos casos se cubren sin inyector.
 */
describe('parsePreferences', () => {
  it('devuelve los valores por defecto cuando no hay nada guardado', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it('ignora un JSON corrupto', () => {
    expect(parsePreferences('{esto no es json')).toEqual(DEFAULT_PREFERENCES);
  });

  it('ignora un valor que no es un objeto', () => {
    expect(parsePreferences('[1,2,3]')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('"texto"')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('null')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('42')).toEqual(DEFAULT_PREFERENCES);
  });

  it('cae al valor por defecto solo del campo inválido, no de todo el objeto', () => {
    const parsed = parsePreferences(
      JSON.stringify({
        indicatorNaming: 'claro',
        showInterpretation: 'sí',
        currencyCode: 'BTC',
        dateFormat: 'AAAA-MM-DD',
      }),
    );

    expect(parsed.indicatorNaming).toBe('claro');
    expect(parsed.dateFormat).toBe('AAAA-MM-DD');
    expect(parsed.showInterpretation).toBe(DEFAULT_PREFERENCES.showInterpretation);
    expect(parsed.currencyCode).toBe(DEFAULT_PREFERENCES.currencyCode);
  });

  it('rechaza un umbral fuera del rango razonable de un índice de desempeño', () => {
    const parsed = parsePreferences(
      JSON.stringify({ warningThreshold: 42, criticalThreshold: -1 }),
    );

    expect(parsed.warningThreshold).toBe(DEFAULT_PREFERENCES.warningThreshold);
    expect(parsed.criticalThreshold).toBe(DEFAULT_PREFERENCES.criticalThreshold);
  });

  it('acepta un umbral dentro de rango, incluidos los extremos', () => {
    const parsed = parsePreferences(JSON.stringify({ warningThreshold: 0, criticalThreshold: 2 }));

    expect(parsed.warningThreshold).toBe(0);
    expect(parsed.criticalThreshold).toBe(2);
  });

  it('rechaza umbrales que no son números finitos', () => {
    const parsed = parsePreferences(JSON.stringify({ warningThreshold: 'alto' }));

    expect(parsed.warningThreshold).toBe(DEFAULT_PREFERENCES.warningThreshold);
  });

  it('conserva un objeto completo y válido tal cual', () => {
    const stored = {
      ...DEFAULT_PREFERENCES,
      indicatorNaming: 'claro' as const,
      showInterpretation: false,
      currencyCode: 'COP' as const,
      dateFormat: 'AAAA-MM-DD' as const,
      warningThreshold: 0.9,
    };

    expect(parsePreferences(JSON.stringify(stored))).toEqual(stored);
  });
});
