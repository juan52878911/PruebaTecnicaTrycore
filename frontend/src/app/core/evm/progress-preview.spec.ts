import {
  isStarted,
  previewProgress,
  ProgressPreviewInput,
  recognisedPercent,
} from './progress-preview';

/**
 * Los valores esperados se derivan a mano de las fórmulas, no se copian de la salida del código:
 *   PV = BAC x % planificado reconocido / 100     EV = BAC x % real reconocido / 100
 *   CV = EV − AC                                  SV = EV − PV
 *   CPI = EV / AC                                 SPI = EV / PV
 *   EAC = BAC / CPI                               VAC = BAC − EAC
 * Con porcentaje completado lo reconocido es lo declarado.
 */
function percentComplete(
  input: Omit<ProgressPreviewInput, 'measurementMethod' | 'started'>,
): ProgressPreviewInput {
  return {
    ...input,
    measurementMethod: 'PERCENT_COMPLETE',
    started: input.actualProgressPercent > 0,
  };
}

describe('previewProgress', () => {
  it('calcula los indicadores de una actividad con sobrecosto y atraso', () => {
    // BAC 400 000, plan 45 %, real 29 %, AC 194 000
    // PV = 180 000 · EV = 116 000 · CV = −78 000 · SV = −64 000
    // CPI = 116 000 / 194 000 = 0,597938... · SPI = 116 000 / 180 000 = 0,644444...
    // EAC = 400 000 / 0,597938... = 668 965,51... · VAC = 400 000 − EAC = −268 965,51...
    const preview = previewProgress(
      percentComplete({
        budgetAtCompletion: 400_000,
        plannedProgressPercent: 45,
        actualProgressPercent: 29,
        actualCost: 194_000,
      }),
    );

    expect(preview.plannedValue).toBe(180_000);
    expect(preview.earnedValue).toBe(116_000);
    expect(preview.costVariance).toBe(-78_000);
    expect(preview.scheduleVariance).toBe(-64_000);
    expect(preview.costPerformanceIndex).toBeCloseTo(0.5979, 4);
    expect(preview.schedulePerformanceIndex).toBeCloseTo(0.6444, 4);
    expect(preview.estimateAtCompletion).toBeCloseTo(668_965.52, 2);
    expect(preview.varianceAtCompletion).toBeCloseTo(-268_965.52, 2);
    expect(preview.effectivePlannedProgressPercent).toBe(45);
    expect(preview.effectiveActualProgressPercent).toBe(29);
  });

  it('calcula una actividad por debajo del presupuesto', () => {
    // BAC 475 000, plan 80 %, real 76 %, AC 352 000
    // PV = 380 000 · EV = 361 000 · CPI = 361 000 / 352 000 = 1,025568...
    const preview = previewProgress(
      percentComplete({
        budgetAtCompletion: 475_000,
        plannedProgressPercent: 80,
        actualProgressPercent: 76,
        actualCost: 352_000,
      }),
    );

    expect(preview.earnedValue).toBe(361_000);
    expect(preview.costPerformanceIndex).toBeCloseTo(1.0256, 4);
    expect(preview.costVariance).toBe(9_000);
  });

  describe('reglas de medición', () => {
    // Ejemplo del contrato: BAC 100 000, plan 50 %, real 40 %, AC 60 000.
    const contractExample = {
      budgetAtCompletion: 100_000,
      plannedProgressPercent: 50,
      actualProgressPercent: 40,
      actualCost: 60_000,
    };

    it('con 0 / 100 no reconoce nada hasta cerrar: PV 0, EV 0 y SPI indefinido', () => {
      const preview = previewProgress({
        ...contractExample,
        measurementMethod: 'FIXED_0_100',
        started: true,
      });

      expect(preview.effectivePlannedProgressPercent).toBe(0);
      expect(preview.effectiveActualProgressPercent).toBe(0);
      expect(preview.plannedValue).toBe(0);
      expect(preview.earnedValue).toBe(0);
      expect(preview.scheduleVariance).toBe(0);
      expect(preview.schedulePerformanceIndex).toBeNull();
      // El CPI sí existe y vale cero: EV 0 sobre AC 60 000.
      expect(preview.costPerformanceIndex).toBe(0);
    });

    it('con 0 / 100 al llegar al 100 % reconoce todo', () => {
      const preview = previewProgress({
        ...contractExample,
        actualProgressPercent: 100,
        measurementMethod: 'FIXED_0_100',
        started: true,
      });

      expect(preview.effectiveActualProgressPercent).toBe(100);
      expect(preview.earnedValue).toBe(100_000);
    });

    it('con 50 / 50 reconoce la mitad a los dos lados: PV 50 000, EV 50 000, SPI 1', () => {
      const preview = previewProgress({
        ...contractExample,
        measurementMethod: 'FIXED_50_50',
        started: true,
      });

      expect(preview.effectivePlannedProgressPercent).toBe(50);
      expect(preview.effectiveActualProgressPercent).toBe(50);
      expect(preview.plannedValue).toBe(50_000);
      expect(preview.earnedValue).toBe(50_000);
      expect(preview.scheduleVariance).toBe(0);
      expect(preview.schedulePerformanceIndex).toBe(1);
      // CPI = 50 000 / 60 000 = 0,8333...
      expect(preview.costPerformanceIndex).toBeCloseTo(0.8333, 4);
    });

    it('con 50 / 50 una actividad no iniciada no reconoce valor ganado', () => {
      const preview = previewProgress({
        ...contractExample,
        actualProgressPercent: 0,
        measurementMethod: 'FIXED_50_50',
        started: false,
      });

      expect(preview.effectiveActualProgressPercent).toBe(0);
      expect(preview.earnedValue).toBe(0);
      // El lado planificado sí ha arrancado (50 % > 0), así que reconoce la mitad.
      expect(preview.plannedValue).toBe(50_000);
    });

    it('con hitos ponderados respeta el porcentaje, que ya viene derivado', () => {
      const preview = previewProgress({
        ...contractExample,
        measurementMethod: 'WEIGHTED_MILESTONES',
        started: true,
      });

      expect(preview.effectiveActualProgressPercent).toBe(40);
      expect(preview.earnedValue).toBe(40_000);
    });
  });

  describe('casos borde', () => {
    it('deja el CPI, el EAC y el VAC indefinidos cuando no hay costo real', () => {
      const preview = previewProgress(
        percentComplete({
          budgetAtCompletion: 90_000,
          plannedProgressPercent: 10,
          actualProgressPercent: 4,
          actualCost: 0,
        }),
      );

      expect(preview.costPerformanceIndex).toBeNull();
      expect(preview.estimateAtCompletion).toBeNull();
      expect(preview.varianceAtCompletion).toBeNull();
      // El SPI sí existe: PV = 9 000, EV = 3 600, SPI = 0,4
      expect(preview.schedulePerformanceIndex).toBeCloseTo(0.4, 4);
    });

    it('deja el SPI indefinido cuando no hay valor planificado', () => {
      const preview = previewProgress(
        percentComplete({
          budgetAtCompletion: 100_000,
          plannedProgressPercent: 0,
          actualProgressPercent: 20,
          actualCost: 15_000,
        }),
      );

      expect(preview.schedulePerformanceIndex).toBeNull();
      expect(preview.costPerformanceIndex).toBeCloseTo(1.3333, 4);
    });

    it('con avance real cero el CPI vale cero, pero el EAC no existe', () => {
      const preview = previewProgress(
        percentComplete({
          budgetAtCompletion: 100_000,
          plannedProgressPercent: 50,
          actualProgressPercent: 0,
          actualCost: 30_000,
        }),
      );

      expect(preview.costPerformanceIndex).toBe(0);
      expect(preview.estimateAtCompletion).toBeNull();
      expect(preview.varianceAtCompletion).toBeNull();
    });

    it('con presupuesto cero todo vale cero y ningún índice existe', () => {
      const preview = previewProgress(
        percentComplete({
          budgetAtCompletion: 0,
          plannedProgressPercent: 50,
          actualProgressPercent: 50,
          actualCost: 0,
        }),
      );

      expect(preview.plannedValue).toBe(0);
      expect(preview.earnedValue).toBe(0);
      expect(preview.costPerformanceIndex).toBeNull();
      expect(preview.schedulePerformanceIndex).toBeNull();
    });

    it('con avance completo y sin desvío los índices valen uno', () => {
      const preview = previewProgress(
        percentComplete({
          budgetAtCompletion: 200_000,
          plannedProgressPercent: 100,
          actualProgressPercent: 100,
          actualCost: 200_000,
        }),
      );

      expect(preview.costPerformanceIndex).toBe(1);
      expect(preview.schedulePerformanceIndex).toBe(1);
      expect(preview.estimateAtCompletion).toBe(200_000);
      expect(preview.varianceAtCompletion).toBe(0);
    });
  });
});

describe('recognisedPercent', () => {
  it('con porcentaje completado devuelve el declarado tal cual', () => {
    expect(recognisedPercent('PERCENT_COMPLETE', 65, false)).toBe(65);
  });

  it('con 0 / 100 solo reconoce el cierre', () => {
    expect(recognisedPercent('FIXED_0_100', 65, true)).toBe(0);
    expect(recognisedPercent('FIXED_0_100', 100, true)).toBe(100);
  });

  it('con 50 / 50 el arranque lo decide el dato, no el porcentaje', () => {
    expect(recognisedPercent('FIXED_50_50', 0, true)).toBe(50);
    expect(recognisedPercent('FIXED_50_50', 0, false)).toBe(0);
    expect(recognisedPercent('FIXED_50_50', 99.99, true)).toBe(50);
    expect(recognisedPercent('FIXED_50_50', 100, false)).toBe(100);
  });
});

describe('isStarted', () => {
  it('arranca con fecha real de inicio aunque el avance sea cero', () => {
    expect(isStarted('2026-03-01', 0)).toBe(true);
  });

  it('arranca con avance declarado aunque no haya fecha', () => {
    expect(isStarted(null, 1)).toBe(true);
    expect(isStarted('', 1)).toBe(true);
  });

  it('no arranca sin ninguna de las dos señales', () => {
    expect(isStarted(null, 0)).toBe(false);
    expect(isStarted('', 0)).toBe(false);
  });
});
