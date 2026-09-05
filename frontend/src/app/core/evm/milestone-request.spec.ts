import { toMilestoneRequests } from './milestone-request';

describe('toMilestoneRequests', () => {
  it('reenvía cada hito con su nombre, peso, estado y fecha, en el mismo orden', () => {
    const requests = toMilestoneRequests([
      {
        name: 'Expediente presentado',
        weightPercent: 15,
        achieved: true,
        achievedOn: '2026-06-20',
      },
      { name: 'Resolución favorable', weightPercent: 40, achieved: false, achievedOn: null },
    ]);

    expect(requests).toEqual([
      {
        name: 'Expediente presentado',
        weightPercent: 15,
        achieved: true,
        achievedOn: '2026-06-20',
      },
      { name: 'Resolución favorable', weightPercent: 40, achieved: false, achievedOn: null },
    ]);
  });

  it('con una lista vacía devuelve una lista vacía', () => {
    expect(toMilestoneRequests([])).toEqual([]);
  });
});
