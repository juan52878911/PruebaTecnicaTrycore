import {
  derivedProgressPercent,
  milestoneTableError,
  milestoneWeightSum,
  toMilestoneDrafts,
  toMilestoneRequests,
} from './milestones';

// Tabla de la semilla: Expediente 15 (cumplido), Auditoría 30 (cumplido), Resolución 40, Publicación 15.
const seeded = [
  { name: 'Expediente presentado', weightPercent: 15, achieved: true, achievedOn: '2026-06-20' },
  { name: 'Auditoría de cumplimiento', weightPercent: 30, achieved: true, achievedOn: '' },
  { name: 'Resolución favorable', weightPercent: 40, achieved: false, achievedOn: '' },
  { name: 'Publicación en el registro', weightPercent: 15, achieved: false, achievedOn: '' },
];

describe('milestones', () => {
  it('convierte la respuesta en borradores con la fecha vacía cuando es nula', () => {
    expect(
      toMilestoneDrafts([
        { name: 'Diseño', weightPercent: 20, achieved: true, achievedOn: null },
        { name: 'Pruebas', weightPercent: 80, achieved: false, achievedOn: null },
      ]),
    ).toEqual([
      { name: 'Diseño', weightPercent: 20, achieved: true, achievedOn: '' },
      { name: 'Pruebas', weightPercent: 80, achieved: false, achievedOn: '' },
    ]);
  });

  it('suma los pesos y deriva el avance de los cumplidos: 15 + 30 = 45', () => {
    expect(milestoneWeightSum(seeded)).toBe(100);
    expect(derivedProgressPercent(seeded)).toBe(45);
  });

  it('suma a dos decimales para que tres tercios den exactamente 100', () => {
    const thirds = [
      { name: 'A', weightPercent: 33.33, achieved: true, achievedOn: '' },
      { name: 'B', weightPercent: 33.33, achieved: true, achievedOn: '' },
      { name: 'C', weightPercent: 33.34, achieved: false, achievedOn: '' },
    ];

    expect(milestoneWeightSum(thirds)).toBe(100);
    expect(derivedProgressPercent(thirds)).toBe(66.66);
    expect(milestoneTableError(thirds)).toBeNull();
  });

  describe('milestoneTableError', () => {
    it('acepta la tabla de la semilla', () => {
      expect(milestoneTableError(seeded)).toBeNull();
    });

    it('exige al menos un hito', () => {
      expect(milestoneTableError([])).toMatch(/al menos un hito/);
    });

    it('exige nombre en cada hito', () => {
      expect(
        milestoneTableError([{ name: '  ', weightPercent: 100, achieved: false, achievedOn: '' }]),
      ).toMatch(/necesitan nombre/);
    });

    it('rechaza un peso de cero, uno mayor que 100 y más de dos decimales', () => {
      expect(
        milestoneTableError([{ name: 'A', weightPercent: 0, achieved: false, achievedOn: '' }]),
      ).toMatch(/entre 0 y 100/);
      expect(
        milestoneTableError([{ name: 'A', weightPercent: 101, achieved: false, achievedOn: '' }]),
      ).toMatch(/entre 0 y 100/);
      expect(
        milestoneTableError([
          { name: 'A', weightPercent: 33.333, achieved: false, achievedOn: '' },
        ]),
      ).toMatch(/2 decimales/);
    });

    it('rechaza una fecha de cumplimiento en un hito no cumplido', () => {
      expect(
        milestoneTableError([
          { name: 'A', weightPercent: 100, achieved: false, achievedOn: '2026-01-01' },
        ]),
      ).toMatch(/no está marcado como cumplido/);
    });

    it('exige que los pesos sumen 100 y dice cuánto suman', () => {
      expect(
        milestoneTableError([
          { name: 'A', weightPercent: 20, achieved: false, achievedOn: '' },
          { name: 'B', weightPercent: 50, achieved: false, achievedOn: '' },
        ]),
      ).toBe('Los pesos deben sumar 100; suman 70');
    });
  });

  it('reenvía cada hito recortando el nombre y anulando la fecha de los no cumplidos', () => {
    expect(
      toMilestoneRequests([
        { name: ' Diseño ', weightPercent: 20, achieved: true, achievedOn: '2026-06-20' },
        { name: 'Cierre', weightPercent: 80, achieved: false, achievedOn: '' },
      ]),
    ).toEqual([
      { name: 'Diseño', weightPercent: 20, achieved: true, achievedOn: '2026-06-20' },
      { name: 'Cierre', weightPercent: 80, achieved: false, achievedOn: null },
    ]);
  });
});
