import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Activity, ActivityRequest } from '../../core/api/models/activity';
import { formatDateRange, formatMoneyRounded } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import {
  combinedStatusLabel,
  costTone,
  overallTone,
  scheduleTone,
} from '../../core/status/status-tone';
import { DualProgress } from '../../shared/ui/dual-progress';
import { EmptyState } from '../../shared/ui/empty-state';
import { GroupedBars } from '../../shared/ui/grouped-bars';
import { IndexValue } from '../../shared/ui/index-value';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { ActivityFormDialog } from './activity-form-dialog';

/** Tabla de actividades del proyecto, con alta, edición y borrado. */
@Component({
  selector: 'app-activities-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectEvmStore],
  imports: [
    ActivityFormDialog,
    DualProgress,
    EmptyState,
    GroupedBars,
    IndexValue,
    RouterLink,
    Skeleton,
    StatusBadge,
  ],
  template: `
    <header class="page-header">
      <div>
        <p class="breadcrumb"><a routerLink="/proyectos">Proyectos</a> · {{ projectName() }}</p>
        <h1>Actividades</h1>
      </div>
      <button type="button" class="primary" (click)="openCreate()">+ Nueva actividad</button>
    </header>

    @if (evm.error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (evm.indicators(); as indicators) {
      <div class="totals">
        <div class="card small">
          <span class="label">{{ labels.short('PV') }} consolidado</span>
          <p class="figure">{{ money(indicators.plannedValue) }}</p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.short('EV') }} consolidado</span>
          <p class="figure accent">{{ money(indicators.earnedValue) }}</p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.short('CV') }}</span>
          <p [class]="'figure tone-' + (indicators.costVariance < 0 ? 'danger' : 'success')">
            {{ money(indicators.costVariance) }}
          </p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.short('SV') }}</span>
          <p [class]="'figure tone-' + (indicators.scheduleVariance < 0 ? 'warning' : 'success')">
            {{ money(indicators.scheduleVariance) }}
          </p>
        </div>
      </div>
    }

    @if (evm.hasTimeline()) {
      <section class="card comparison">
        <h2>
          {{ labels.short('PV') }} · {{ labels.short('EV') }} · {{ labels.short('AC') }} por corte
        </h2>
        <p class="lead">
          La curva del panel muestra la tendencia acumulada; esta comparativa deja ver la distancia
          entre las tres series en cada corte.
        </p>
        <app-grouped-bars
          [points]="evm.timeline()"
          [plannedLabel]="labels.short('PV')"
          [earnedLabel]="labels.short('EV')"
          [actualCostLabel]="labels.short('AC')"
        />
      </section>
    }

    @if (evm.isLoading() && rows().length === 0) {
      <div class="card">
        @for (placeholder of placeholders; track placeholder) {
          <div class="skeleton-row">
            <app-skeleton width="35%" [height]="16" />
            <app-skeleton width="60%" [height]="12" />
          </div>
        }
      </div>
    } @else if (!evm.hasActivities()) {
      <app-empty-state
        title="Aún no hay actividades"
        description="Sin actividades registradas no es posible calcular PV, EV ni los índices del proyecto. Agrega la primera para empezar el análisis."
        actionLabel="+ Nueva actividad"
        (action)="openCreate()"
      />
    } @else {
      <div class="card table" role="table" aria-label="Actividades del proyecto">
        <div class="row head" role="row">
          <span role="columnheader">Actividad</span>
          <span role="columnheader">{{ labels.short('BAC') }}</span>
          <span role="columnheader">Avance</span>
          <span role="columnheader">{{ labels.short('AC') }}</span>
          <span role="columnheader">{{ labels.short('CPI') }}</span>
          <span role="columnheader">{{ labels.short('SPI') }}</span>
          <span role="columnheader">Estado</span>
        </div>
        @for (row of rows(); track row.activity.id) {
          <div class="row" role="row">
            <div class="name-cell" role="cell">
              <span class="rail" [class]="'tone-' + row.tone" aria-hidden="true"></span>
              <button type="button" class="name" (click)="openDetail(row.activity.id)">
                <span class="title">{{ row.activity.name }}</span>
                @if (row.dates) {
                  <span class="meta">{{ row.dates }}</span>
                }
              </button>
            </div>
            <span class="tabular" role="cell">{{ money(row.activity.budgetAtCompletion) }}</span>
            <span role="cell">
              <app-dual-progress
                [planned]="row.activity.plannedProgressPercent"
                [actual]="row.activity.actualProgressPercent"
              />
            </span>
            <span class="tabular" role="cell">{{ money(row.activity.actualCost) }}</span>
            <span role="cell">
              <app-index-value
                [value]="row.activity.indicators.costPerformanceIndex"
                [tone]="row.costTone"
                [hint]="row.activity.indicators.costStatus.message"
              />
            </span>
            <span role="cell">
              <app-index-value
                [value]="row.activity.indicators.schedulePerformanceIndex"
                [tone]="row.scheduleTone"
                [hint]="row.activity.indicators.scheduleStatus.message"
              />
            </span>
            <span class="actions" role="cell">
              <app-status-badge [label]="row.statusLabel" [tone]="row.tone" />
              <button type="button" class="icon" (click)="openEdit(row.activity)">Editar</button>
              <button type="button" class="icon danger" (click)="confirmRemove(row.activity)">
                Borrar
              </button>
            </span>
          </div>
        }
      </div>
    }

    @if (formOpen()) {
      <app-activity-form-dialog
        [activity]="editing()"
        [serverError]="evm.error()"
        (save)="persist($event)"
        (dismissed)="closeForm()"
      />
    }
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }
    .breadcrumb {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-dim);
    }
    .breadcrumb a {
      text-decoration: none;
    }
    h1 {
      margin: 0;
      font-size: 44px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.035em;
    }
    .primary {
      border: none;
      border-radius: var(--radius-pill);
      background: #fff;
      color: var(--screen);
      font-size: 13px;
      font-weight: 700;
      padding: 12px 22px;
      white-space: nowrap;
    }
    .banner {
      margin: 0 0 18px;
      padding: 14px 18px;
      border-radius: var(--radius-tile);
      background: var(--danger-soft);
      border: 1px solid rgba(255, 138, 107, 0.32);
      color: var(--danger);
      font-size: 13px;
      font-weight: 600;
    }
    .totals {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: var(--gap-grid);
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: 8px 14px 14px;
      overflow-x: auto;
    }
    .card.small {
      border-radius: 18px;
      padding: 18px 20px;
      overflow: visible;
    }
    .comparison {
      padding: var(--pad-card);
      overflow: visible;
      margin-bottom: var(--gap-grid);
    }
    .comparison h2 {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .comparison .lead {
      margin: 0 0 18px;
      max-width: 620px;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--text-dim);
    }
    .label {
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.07em;
      color: var(--text-dim);
    }
    .figure {
      margin: 10px 0 0;
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .figure.accent {
      color: var(--accent-text);
    }
    .row {
      display: grid;
      grid-template-columns: 2.3fr 0.85fr 1.6fr 0.95fr 0.78fr 0.78fr 1.5fr;
      gap: 14px;
      align-items: center;
      padding: 14px 12px;
      border-radius: var(--radius-tile);
      min-width: 1000px;
      transition: background var(--motion-veil);
    }
    .row:not(.head):hover {
      background: rgba(255, 255, 255, 0.045);
    }
    .row.head {
      padding: 18px 12px 14px;
      border-bottom: 1px solid var(--border-card);
      border-radius: 0;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.36);
      min-width: 1000px;
    }
    .name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .rail {
      flex: none;
      width: 4px;
      height: 36px;
      border-radius: 9px;
      background: currentColor;
    }
    .name {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      border: none;
      background: none;
      padding: 0;
      text-align: left;
    }
    .title {
      font-size: 14.5px;
      font-weight: 700;
    }
    .meta {
      font-size: 11.5px;
      color: var(--text-dim);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .icon {
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
      background: var(--control);
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 600;
      padding: 6px 12px;
    }
    .icon:hover {
      background: var(--control-hover);
      color: var(--text);
    }
    .icon.danger:hover {
      color: var(--danger);
      border-color: rgba(255, 138, 107, 0.4);
    }
    .skeleton-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px 12px;
    }
    @media (max-width: 767px) {
      h1 {
        font-size: 24px;
      }
      .totals {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class ActivitiesPage {
  protected readonly evm = inject(ProjectEvmStore);
  protected readonly labels = inject(IndicatorLabels);
  private readonly preferences = inject(PreferencesStore);
  private readonly selection = inject(SelectedProjectStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly money = formatMoneyRounded;
  protected readonly placeholders = [0, 1, 2, 3];

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Activity | null>(null);

  private readonly projectId = computed(() => {
    const raw = this.route.snapshot.paramMap.get('projectId');
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  });

  protected readonly projectName = computed(() => this.evm.summary()?.project.name ?? 'Proyecto');

  protected readonly rows = computed(() => {
    const dateFormat = this.preferences.preferences().dateFormat;
    return this.evm.activityList().map((activity) => ({
      activity,
      dates: formatDateRange(activity.plannedStartDate, activity.plannedEndDate, dateFormat),
      costTone: costTone(activity.indicators.costStatus.status),
      scheduleTone: scheduleTone(activity.indicators.scheduleStatus.status),
      statusLabel: combinedStatusLabel(activity.indicators),
      tone: overallTone(activity.indicators),
    }));
  });

  constructor() {
    const projectId = this.projectId();
    if (projectId !== undefined) {
      this.selection.select(projectId);
    }
    // El botón "+" de la barra superior abre el alta desde cualquier vista pasando ?nueva=1.
    if (this.route.snapshot.queryParamMap.has('nueva')) {
      this.formOpen.set(true);
    }
    effect(() => this.evm.select(this.projectId()));
  }

  protected openCreate(): void {
    this.evm.clearError();
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(activity: Activity): void {
    this.evm.clearError();
    this.editing.set(activity);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.evm.clearError();
  }

  protected openDetail(activityId: number): void {
    const projectId = this.projectId();
    if (projectId !== undefined) {
      void this.router.navigate(['/proyectos', projectId, 'actividades', activityId]);
    }
  }

  protected async persist(request: ActivityRequest): Promise<void> {
    const projectId = this.projectId();
    if (projectId === undefined) {
      return;
    }
    const existing = this.editing();
    const saved =
      existing === null
        ? await this.evm.createActivity(projectId, request)
        : await this.evm.updateActivity(projectId, existing.id, request);
    if (saved === null) {
      return;
    }
    this.formOpen.set(false);
    this.editing.set(null);
    this.toasts.success(
      existing === null ? 'Actividad creada' : 'Actividad actualizada',
      `${saved.name}. Indicadores recalculados por el servidor.`,
    );
  }

  protected async confirmRemove(activity: Activity): Promise<void> {
    const projectId = this.projectId();
    if (projectId === undefined) {
      return;
    }
    if (!globalThis.confirm(`¿Borrar la actividad "${activity.name}"?`)) {
      return;
    }
    if (await this.evm.removeActivity(projectId, activity.id)) {
      this.toasts.info('Actividad borrada', `${activity.name} ya no cuenta en el consolidado.`);
    }
  }
}
