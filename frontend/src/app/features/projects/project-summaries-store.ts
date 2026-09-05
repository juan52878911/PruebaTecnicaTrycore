import { computed, inject, Injectable, resource, Signal } from '@angular/core';

import { asDisplayableError } from '../../core/api/api-error';
import { Project, ProjectSummary } from '../../core/api/models/project';
import { ProjectsApi } from '../../core/api/projects-api';
import {
  combinedStatusLabel,
  costTone,
  overallTone,
  scheduleTone,
  Tone,
} from '../../core/status/status-tone';
import { UndefinedIndicator } from '../../core/api/models/evm';

/** Un proyecto con su consolidado ya resuelto, listo para pintar en una fila o en el selector. */
export interface ProjectSummaryRow {
  readonly project: Project;
  readonly activityCount: number;
  readonly meta: string;
  readonly budgetAtCompletion: number;
  readonly earnedValue: number;
  readonly actualCost: number;
  readonly costPerformanceIndex: UndefinedIndicator;
  readonly schedulePerformanceIndex: UndefinedIndicator;
  readonly costTone: Tone;
  readonly scheduleTone: Tone;
  readonly statusLabel: string;
  readonly statusTone: Tone;
  readonly hasData: boolean;
}

function activityLabel(count: number): string {
  return count === 1 ? '1 actividad' : `${count} actividades`;
}

function toRow(summary: ProjectSummary): ProjectSummaryRow {
  const { activityCount, totals, indicators, ...project } = summary;
  const hasData = activityCount > 0;
  return {
    project,
    activityCount,
    meta:
      project.manager === null
        ? activityLabel(activityCount)
        : `${activityLabel(activityCount)} · ${project.manager}`,
    budgetAtCompletion: totals.budgetAtCompletion,
    earnedValue: indicators.earnedValue,
    actualCost: indicators.actualCost,
    costPerformanceIndex: indicators.costPerformanceIndex,
    schedulePerformanceIndex: indicators.schedulePerformanceIndex,
    costTone: costTone(indicators),
    scheduleTone: scheduleTone(indicators),
    statusLabel: hasData ? combinedStatusLabel(indicators) : 'Sin datos',
    statusTone: hasData ? overallTone(indicators) : 'neutral',
    hasData,
  };
}

/**
 * Consolidado de todos los proyectos, en una sola petición.
 *
 * Se carga una vez y se comparte entre el listado, el perfil y el selector de la cabecera. Antes
 * era una ráfaga de `/projects/{id}/evm` por proyecto; el backend expone ahora el consolidado en el
 * propio listado con `includeIndicators=true`.
 */
@Injectable({ providedIn: 'root' })
export class ProjectSummariesStore {
  private readonly api = inject(ProjectsApi);

  private readonly summaries = resource<readonly ProjectSummaryRow[], void>({
    loader: async ({ abortSignal }) => {
      const summaries = await this.api.listWithIndicators({ signal: abortSignal });
      return summaries.map(toRow);
    },
    defaultValue: [],
  });

  readonly rows: Signal<readonly ProjectSummaryRow[]> = computed(() =>
    this.summaries.hasValue() ? this.summaries.value() : [],
  );
  readonly isLoading = this.summaries.isLoading;
  readonly error = computed(() => asDisplayableError(this.summaries.error()));

  readonly totalActivities = computed(() =>
    this.rows().reduce((total, row) => total + row.activityCount, 0),
  );

  byId(projectId: number | undefined): Signal<ProjectSummaryRow | undefined> {
    return computed(() =>
      projectId === undefined ? undefined : this.rows().find((row) => row.project.id === projectId),
    );
  }

  reload(): void {
    this.summaries.reload();
  }
}
