import { Milestone, MilestoneRequest, PERCENT_DECIMAL_PLACES } from '../api/models/activity';

/**
 * Hito tal como se edita en un formulario. `achievedOn` vacío significa sin fecha; el servidor
 * solo la admite en un hito cumplido.
 */
export interface MilestoneDraft {
  readonly name: string;
  readonly weightPercent: number;
  readonly achieved: boolean;
  readonly achievedOn: string;
}

/** Límites que valida el backend sobre cada hito y sobre el conjunto. */
export const MILESTONE_NAME_MAX_LENGTH = 120;
export const MILESTONE_WEIGHT_TOTAL = 100;
const WEIGHT_MIN_EXCLUSIVE = 0;
const DECIMAL_FACTOR = 10;
const WEIGHT_FACTOR = DECIMAL_FACTOR ** PERCENT_DECIMAL_PLACES;

export const EMPTY_MILESTONE: MilestoneDraft = {
  name: '',
  weightPercent: 0,
  achieved: false,
  achievedOn: '',
};

export function toMilestoneDrafts(milestones: readonly Milestone[]): readonly MilestoneDraft[] {
  return milestones.map((milestone) => ({
    name: milestone.name,
    weightPercent: milestone.weightPercent,
    achieved: milestone.achieved,
    achievedOn: milestone.achievedOn ?? '',
  }));
}

/** Suma a dos decimales: 33,33 + 33,33 + 33,34 debe dar exactamente 100, no 100,00000001. */
function roundWeight(value: number): number {
  return Math.round(value * WEIGHT_FACTOR) / WEIGHT_FACTOR;
}

function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function milestoneWeightSum(drafts: readonly MilestoneDraft[]): number {
  return roundWeight(drafts.reduce((total, draft) => total + Number(draft.weightPercent), 0));
}

/**
 * Avance que reconocen los hitos cumplidos. Es el mismo número que el servidor devuelve como
 * `derivedProgressPercent`; aquí se anticipa para la vista previa.
 */
export function derivedProgressPercent(drafts: readonly MilestoneDraft[]): number {
  return roundWeight(
    drafts
      .filter((draft) => draft.achieved)
      .reduce((total, draft) => total + Number(draft.weightPercent), 0),
  );
}

/**
 * Primer motivo por el que el servidor rechazaría la tabla, o nulo si es válida. Se comprueba en
 * el navegador para no descubrir en un 400 lo que el formulario ya sabe.
 */
export function milestoneTableError(drafts: readonly MilestoneDraft[]): string | null {
  if (drafts.length === 0) {
    return 'Una actividad medida por hitos debe declarar al menos un hito';
  }
  for (const draft of drafts) {
    if (draft.name.trim() === '') {
      return 'Todos los hitos necesitan nombre';
    }
    const weight = Number(draft.weightPercent);
    if (
      !Number.isFinite(weight) ||
      weight <= WEIGHT_MIN_EXCLUSIVE ||
      weight > MILESTONE_WEIGHT_TOTAL
    ) {
      return `El peso de "${draft.name.trim()}" debe estar entre 0 y ${MILESTONE_WEIGHT_TOTAL}, sin incluir el 0`;
    }
    if (decimalsOf(weight) > PERCENT_DECIMAL_PLACES) {
      return `El peso de "${draft.name.trim()}" admite como máximo ${PERCENT_DECIMAL_PLACES} decimales`;
    }
    if (!draft.achieved && draft.achievedOn !== '') {
      return `"${draft.name.trim()}" tiene fecha de cumplimiento pero no está marcado como cumplido`;
    }
  }
  const sum = milestoneWeightSum(drafts);
  if (sum !== MILESTONE_WEIGHT_TOTAL) {
    return `Los pesos deben sumar ${MILESTONE_WEIGHT_TOTAL}; suman ${sum}`;
  }
  return null;
}

/**
 * Hitos tal como hay que enviarlos. La lista reemplaza entera a la anterior y una actividad medida
 * por hitos debe tenerlos válidos desde el primer instante; por eso el servidor la exige en cada
 * petición con esa regla, también en una modificación que no los toca.
 */
export function toMilestoneRequests(
  drafts: readonly MilestoneDraft[],
): readonly MilestoneRequest[] {
  return drafts.map((draft) => ({
    name: draft.name.trim(),
    weightPercent: Number(draft.weightPercent),
    achieved: draft.achieved,
    achievedOn: draft.achieved && draft.achievedOn !== '' ? draft.achievedOn : null,
  }));
}
