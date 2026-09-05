import { computed, inject, Injectable, resource, signal, Signal } from '@angular/core';

import { ActivitiesApi } from '../../core/api/activities-api';
import { ApiError, asDisplayableError, toApiError } from '../../core/api/api-error';
import { MeasurementsApi } from '../../core/api/measurements-api';
import { Activity, ActivityRequest, ProjectEvmSummary } from '../../core/api/models/activity';
import { EvmIndicators } from '../../core/api/models/evm';
import { MeasurementPoint, MeasurementRequest } from '../../core/api/models/measurement';
import { ProjectsApi } from '../../core/api/projects-api';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { isAtRisk, severityTone, Tone } from '../../core/status/status-tone';

/** Actividad señalada por el servidor, con el tono de su severidad. */
export interface ActivityWithRisk {
  readonly activity: Activity;
  readonly tone: Tone;
  readonly critical: boolean;
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
  private readonly summaryResource = resource<
    ProjectEvmSummary,
    { readonly projectId: number; readonly eacFormula: string } | undefined
  >({
    // La fórmula entra en los parámetros, no solo en la petición: cambiarla en Ajustes tiene que
    // volver a pedir el consolidado, porque el EAC titular lo decide el servidor.
    params: () => {
      const projectId = this.selectedId();
      return projectId === undefined
        ? undefined
        : { projectId, eacFormula: this.preferences.eacFormula() };
    },
    loader: ({ params, abortSignal }) =>
      this.projects.evmSummary(params.projectId, {
        signal: abortSignal,
        eacFormula: params.eacFormula,
      }),
  });

  private readonly timelineResource = resource<
    readonly MeasurementPoint[],
    { readonly projectId: number; readonly eacFormula: string } | undefined
  >({
    params: () => {
      const projectId = this.selectedId();
      return projectId === undefined
        ? undefined
        : { projectId, eacFormula: this.preferences.eacFormula() };
    },
    loader: async ({ params, abortSignal }) => {
      const timeline = await this.measurements.timeline(params.projectId, {
        signal: abortSignal,
        eacFormula: params.eacFormula,
      });
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

  /**
   * Actividades que el servidor marcó con desviación relevante.
   *
   * El nivel de riesgo ya no se calcula aquí: viene en la severidad de cada índice, medida contra
   * los umbrales de tolerancia del backend. Repetirlos en el cliente abría la puerta a que el
   * color dijera una cosa y el texto otra.
   */
  readonly activitiesAtRisk: Signal<readonly ActivityWithRisk[]> = computed(() =>
    this.activityList()
      .filter((activity) => isAtRisk(activity.indicators))
      .map((activity) => {
        const worst = [
          activity.indicators.costStatus.severity,
          activity.indicators.scheduleStatus.severity,
        ];
        const critical = worst.includes('CRITICAL');
        return {
          activity,
          tone: severityTone(critical ? 'CRITICAL' : 'WARNING'),
          critical,
        };
      }),
  );

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
