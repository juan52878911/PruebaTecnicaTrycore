import { computed, inject, Injectable, resource, signal, Signal } from '@angular/core';

import { ActivitiesApi } from '../../core/api/activities-api';
import { ApiError, asDisplayableError, toApiError } from '../../core/api/api-error';
import { MeasurementsApi } from '../../core/api/measurements-api';
import { Activity, ActivityRequest, ProjectEvmSummary } from '../../core/api/models/activity';
import { EvmIndicators } from '../../core/api/models/evm';
import { MeasurementPoint, MeasurementRequest } from '../../core/api/models/measurement';
import { ProjectsApi } from '../../core/api/projects-api';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { riskLevel, RiskLevel } from '../../core/status/status-tone';

/** Actividad con su nivel de riesgo ya resuelto según los umbrales configurados. */
export interface ActivityWithRisk {
  readonly activity: Activity;
  readonly risk: RiskLevel;
}

/**
 * Estado del análisis de un proyecto: consolidado, actividades y serie histórica.
 *
 * Se provee a nivel de ruta y no en la raíz, para que navegar a otro proyecto arranque con el
 * estado limpio en lugar de mostrar por un instante los datos del anterior.
 */
@Injectable()
export class ProjectEvmStore {
  private readonly projects = inject(ProjectsApi);
  private readonly activities = inject(ActivitiesApi);
  private readonly measurements = inject(MeasurementsApi);
  private readonly preferences = inject(PreferencesStore);

  private readonly selectedId = signal<number | undefined>(undefined);
  private readonly mutating = signal(false);
  private readonly mutationError = signal<ApiError | null>(null);

  // El parámetro incluye `undefined` a propósito: `resource()` interpreta unos parámetros
  // indefinidos como "todavía no cargues", que es el estado inicial sin proyecto seleccionado.
  // Dentro del cargador, en cambio, ya llega como número.
  private readonly summaryResource = resource<ProjectEvmSummary, number | undefined>({
    params: () => this.selectedId(),
    loader: ({ params, abortSignal }) => this.projects.evmSummary(params, { signal: abortSignal }),
  });

  private readonly timelineResource = resource<readonly MeasurementPoint[], number | undefined>({
    params: () => this.selectedId(),
    loader: async ({ params, abortSignal }) => {
      const timeline = await this.measurements.timeline(params, { signal: abortSignal });
      return timeline.points;
    },
    defaultValue: [],
  });

  /**
   * Consolidado publicado.
   *
   * Se lee con `hasValue()` porque en Angular 22 un recurso en estado de error lanza al leer su
   * valor, incluso con `defaultValue` declarado: leerlo a pelo rompería la plantilla en vez de
   * mostrar el aviso de error.
   */
  readonly summary: Signal<ProjectEvmSummary | undefined> = computed(() =>
    this.summaryResource.hasValue() ? this.summaryResource.value() : undefined,
  );
  readonly indicators: Signal<EvmIndicators | undefined> = computed(
    () => this.summary()?.indicators,
  );
  readonly budgetAtCompletion = computed(() => this.summary()?.budgetAtCompletion ?? 0);
  readonly activityList: Signal<readonly Activity[]> = computed(
    () => this.summary()?.activities ?? [],
  );
  readonly timeline: Signal<readonly MeasurementPoint[]> = computed(() =>
    this.timelineResource.hasValue() ? this.timelineResource.value() : [],
  );

  readonly isLoading = computed(
    () => this.summaryResource.isLoading() || this.timelineResource.isLoading() || this.mutating(),
  );
  readonly error = computed(
    () =>
      asDisplayableError(this.summaryResource.error()) ??
      asDisplayableError(this.timelineResource.error()) ??
      this.mutationError(),
  );

  readonly hasActivities = computed(() => this.activityList().length > 0);
  readonly hasTimeline = computed(() => this.timeline().length > 0);

  /** Actividades ordenadas de peor a mejor desempeño, con su nivel de riesgo. */
  readonly activitiesAtRisk: Signal<readonly ActivityWithRisk[]> = computed(() => {
    const { warningThreshold, criticalThreshold } = this.preferences.preferences();
    return this.activityList()
      .map((activity) => ({
        activity,
        risk: riskLevel(activity.indicators, warningThreshold, criticalThreshold),
      }))
      .filter((entry) => entry.risk !== 'none');
  });

  select(projectId: number | undefined): void {
    this.selectedId.set(projectId);
  }

  reload(): void {
    this.summaryResource.reload();
    this.timelineResource.reload();
  }

  clearError(): void {
    this.mutationError.set(null);
  }

  async createActivity(projectId: number, request: ActivityRequest): Promise<Activity | null> {
    return this.mutate(() => this.activities.create(projectId, request));
  }

  async updateActivity(
    projectId: number,
    activityId: number,
    request: ActivityRequest,
  ): Promise<Activity | null> {
    return this.mutate(() => this.activities.update(projectId, activityId, request));
  }

  async removeActivity(projectId: number, activityId: number): Promise<boolean> {
    const result = await this.mutate(async () => {
      await this.activities.remove(projectId, activityId);
      return true as const;
    });
    return result === true;
  }

  async createMeasurement(projectId: number, request: MeasurementRequest): Promise<boolean> {
    const result = await this.mutate(async () => {
      await this.measurements.create(projectId, request);
      return true as const;
    });
    return result === true;
  }

  async removeMeasurement(projectId: number, measurementId: number): Promise<boolean> {
    const result = await this.mutate(async () => {
      await this.measurements.remove(projectId, measurementId);
      return true as const;
    });
    return result === true;
  }

  private async mutate<T>(operation: () => Promise<T>): Promise<T | null> {
    this.mutating.set(true);
    this.mutationError.set(null);
    try {
      const result = await operation();
      // El recálculo lo hace el servidor; aquí solo se decide cuándo se vuelve a pedir.
      if (this.preferences.autoRefreshAfterSave()) {
        this.reload();
      }
      return result;
    } catch (error: unknown) {
      this.mutationError.set(toApiError(error));
      return null;
    } finally {
      this.mutating.set(false);
    }
  }
}
