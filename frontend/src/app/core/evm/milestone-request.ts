import { Milestone, MilestoneRequest } from '../api/models/activity';

/**
 * Hitos de la actividad tal como hay que reenviarlos.
 *
 * Con `WEIGHTED_MILESTONES` el servidor exige la tabla de hitos en cada petición, también en una
 * modificación que no los toca: la lista reemplaza entera a la anterior y una actividad medida por
 * hitos debe tenerlos válidos desde el primer instante. Este cliente aún no los edita, así que los
 * devuelve tal como llegaron.
 */
export function toMilestoneRequests(milestones: readonly Milestone[]): readonly MilestoneRequest[] {
  return milestones.map((milestone) => ({
    name: milestone.name,
    weightPercent: milestone.weightPercent,
    achieved: milestone.achieved,
    achievedOn: milestone.achievedOn,
  }));
}
