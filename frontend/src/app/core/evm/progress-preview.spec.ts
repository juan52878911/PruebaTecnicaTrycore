import { previewProgress } from './progress-preview';

/**
 * Los valores esperados se derivan a mano de las fórmulas, no se copian de la salida del código:
 *   PV = BAC x % planificado / 100     EV = BAC x % real / 100
 *   CV = EV − AC                       SV = EV − PV
 *   CPI = EV / AC                      SPI = EV / PV
 *   EAC = BAC / CPI                    VAC = BAC − EAC
 */
describe('previewProgress', () => {
  it('calcula los indicadores de una actividad con sobrecosto y atraso', () => {
    // BAC 400 000, plan 45 %, real 29 %, AC 194 000
    // PV = 180 000 · EV = 116 000 · CV = −78 000 · SV = −64 000
    // CPI = 116 000 / 194 000 = 0,597938... · SPI = 116 000 / 180 000 = 0,644444...
    // EAC = 400 000 / 0,597938... = 668 965,51... · VAC = 400 000 − EAC = −268 965,51...
    const preview = previewProgress({
      budgetAtCompletion: 400_000,
      plannedProgressPercent: 45,
      actualProgressPercent: 29,
      actualCost: 194_000,
    });

    expect(preview.plannedValue).toBe(180_000);
    expect(preview.earnedValue).toBe(116_000);
    expect(preview.costVariance).toBe(-78_000);
    expect(preview.scheduleVariance).toBe(-64_000);
    expect(preview.costPerformanceIndex).toBeCloseTo(0.5979, 4);
    expect(preview.schedulePerformanceIndex).toBeCloseTo(0.6444, 4);
    expect(preview.estimateAtCompletion).toBeCloseTo(668_965.52, 2);
    expect(preview.varianceAtCompletion).toBeCloseTo(-268_965.52, 2);
  });

  it('calcula una actividad por debajo del presupuesto', () => {
    // BAC 475 000, plan 80 %, real 76 %, AC 352 000
    // PV = 380 000 · EV = 361 000 · CPI = 361 000 / 352 000 = 1,025568...
    const preview = previewProgress({
      budgetAtCompletion: 475_000,
      plannedProgressPercent: 80,
      actualProgressPercent: 76,
      actualCost: 352_000,
    });

    expect(preview.earnedValue).toBe(361_000);
    expect(preview.costPerformanceIndex).toBeCloseTo(1.0256, 4);
    expect(preview.costVariance).toBe(9_000);
  });

  describe('casos borde', () => {
    it('deja el CPI, el EAC y el VAC indefinidos cuando no hay costo real', () => {
      const preview = previewProgress({
        budgetAtCompletion: 90_000,
        plannedProgressPercent: 10,
        actualProgressPercent: 4,
        actualCost: 0,
      });

      expect(preview.costPerformanceIndex).toBeNull();
      expect(preview.estimateAtCompletion).toBeNull();
      expect(preview.varianceAtCompletion).toBeNull();
      // El SPI sí existe: PV = 9 000, EV = 3 600, SPI = 0,4
      expect(preview.schedulePerformanceIndex).toBeCloseTo(0.4, 4);
    });

    it('deja el SPI indefinido cuando no hay valor planificado', () => {
      const preview = previewProgress({
        budgetAtCompletion: 100_000,
        plannedProgressPercent: 0,
        actualProgressPercent: 20,
        actualCost: 15_000,
      });

      expect(preview.schedulePerformanceIndex).toBeNull();
      expect(preview.costPerformanceIndex).toBeCloseTo(1.3333, 4);
    });

    it('con avance real cero el CPI vale cero, pero el EAC no existe', () => {
      const preview = previewProgress({
        budgetAtCompletion: 100_000,
        plannedProgressPercent: 50,
        actualProgressPercent: 0,
        actualCost: 30_000,
      });

      expect(preview.costPerformanceIndex).toBe(0);
      expect(preview.estimateAtCompletion).toBeNull();
      expect(preview.varianceAtCompletion).toBeNull();
    });

    it('con presupuesto cero todo vale cero y ningún índice existe', () => {
      const preview = previewProgress({
        budgetAtCompletion: 0,
        plannedProgressPercent: 50,
        actualProgressPercent: 50,
        actualCost: 0,
      });

      expect(preview.plannedValue).toBe(0);
      expect(preview.earnedValue).toBe(0);
      expect(preview.costPerformanceIndex).toBeNull();
      expect(preview.schedulePerformanceIndex).toBeNull();
    });

    it('con avance completo y sin desvío los índices valen uno', () => {
      const preview = previewProgress({
        budgetAtCompletion: 200_000,
        plannedProgressPercent: 100,
        actualProgressPercent: 100,
        actualCost: 200_000,
      });

      expect(preview.costPerformanceIndex).toBe(1);
      expect(preview.schedulePerformanceIndex).toBe(1);
      expect(preview.estimateAtCompletion).toBe(200_000);
      expect(preview.varianceAtCompletion).toBe(0);
    });
  });
});
