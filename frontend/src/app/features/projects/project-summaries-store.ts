import { computed, inject, Injectable, resource, Signal } from '@angular/core';

import { asDisplayableError } from '../../core/api/api-error';
import { ProjectEvmSummary } from '../../core/api/models/activity';
import { Project } from '../../core/api/models/project';
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

function toRow(summary: ProjectEvmSummary): ProjectSummaryRow {
  const indicators = summary.indicators;
  const activityCount = summary.activities.length;
  const hasData = activityCount > 0;
  return {
    project: summary.project,
    activityCount,
    meta: activityCount === 1 ? '1 actividad' : `${activityCount} actividades`,
    budgetAtCompletion: summary.budgetAtCompletion,
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
 * Consolidado de todos los proyectos.
 *
 * `GET /projects` no devuelve cifras, así que hay que pedir el resumen de cada proyecto. Se hace
 * una sola vez y desde aquí, en lugar de repetir la misma ráfaga en el listado, en el perfil y en
 * el selector de la cabecera. La solución de fondo es un endpoint consolidado en el backend; queda
 * anotado en AI_PROCESS.md.
 */
@Injectable({ providedIn: 'root' })
export class ProjectSummariesStore {
  private readonly api = inject(ProjectsApi);

  private readonly summaries = resource<readonly ProjectSummaryRow[], void>({
    loader: async ({ abortSignal }) => {
      const projects = await this.api.list({ signal: abortSignal });
      const results = await Promise.all(
        projects.map((project) =>
          this.api
            .evmSummary(project.id, { signal: abortSignal })
            .then(toRow)
            // Un proyecto cuyo consolidado falla no debe tumbar la tabla entera.
            .catch(() => null),
        ),
      );
      return results.filter((row): row is ProjectSummaryRow => row !== null);
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
