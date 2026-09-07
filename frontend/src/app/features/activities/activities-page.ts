import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { Activity, ActivityRequest } from '../../core/api/models/activity';
import {
  formatCompact,
  formatDateRange,
  formatMoneyRounded,
  formatShortDate,
} from '../../core/format/evm-format';
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
import { ActivityBars } from '../../shared/ui/activity-bars';
import { ChipButton } from '../../shared/ui/chip-button';
import { EmptyState } from '../../shared/ui/empty-state';
import { GroupedBars } from '../../shared/ui/grouped-bars';
import { IndexValue } from '../../shared/ui/index-value';
import { Skeleton } from '../../shared/ui/skeleton';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { PageHeader } from '../../shared/ui/page-header';
import { RowTools } from '../../shared/ui/row-tools';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { PickerOption, ProjectPicker } from '../evm/project-picker';
import { ProjectSummariesStore } from '../projects/project-summaries-store';
import { ActivityFormDialog } from './activity-form-dialog';

type StatusFilter = 'todos' | 'riesgo' | 'al-dia' | 'sin-datos';

function parseId(raw: string | null): number | undefined {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Tabla de actividades del proyecto, con alta, edición y borrado. */
@Component({
  selector: 'app-activities-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  providers: [ProjectEvmStore],
  imports: [
    ActivityFormDialog,
    ChipButton,
    ActivityBars,
    DualProgress,
    EmptyState,
    GroupedBars,
    IndexValue,
    PageHeader,
    ProjectPicker,
    RowTools,
    Skeleton,
    StatusBadge,
  ],
  template: `
    <app-page-header title="Actividades" [subtitle]="projectName()">
      <!-- El mismo selector del panel: cambiar de proyecto no obliga a volver al listado. -->
      <div class="anchor">
        <app-chip-button
          [label]="projectName()"
          [open]="pickerOpen()"
          (pressed)="pickerOpen.set(!pickerOpen())"
        />
        @if (pickerOpen()) {
          <app-project-picker
            [options]="pickerOptions()"
            [selectedId]="projectId()"
            (choose)="choose($event)"
            (dismissed)="pickerOpen.set(false)"
          />
        }
      </div>
      <div class="anchor">
        <app-chip-button
          [label]="statusFilterLabel()"
          [open]="statusMenuOpen()"
          (pressed)="statusMenuOpen.set(!statusMenuOpen())"
        />
        @if (statusMenuOpen()) {
          <div class="status-menu" role="radiogroup" aria-label="Filtrar por estado">
            @for (option of statusOptions; track option.value) {
              <button
                type="button"
                role="radio"
                [class.active]="option.value === statusFilter()"
                [attr.aria-checked]="option.value === statusFilter()"
                (click)="chooseStatus(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        }
      </div>
      @if (lastCutoffShort(); as cutoff) {
        <app-chip-button [label]="'Corte: ' + cutoff" informative />
      }
    </app-page-header>

    @if (evm.error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (evm.indicators(); as indicators) {
      <div class="totals">
        <div class="card small">
          <span class="label">{{ labels.title('PV') }} consolidado</span>
          <p class="figure">{{ compact(indicators.plannedValue) }}</p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.title('EV') }} consolidado</span>
          <p class="figure accent">{{ compact(indicators.earnedValue) }}</p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.title('CV') }}</span>
          <p [class]="'figure tone-' + (indicators.costVariance < 0 ? 'danger' : 'success')">
            {{ money(indicators.costVariance) }}
          </p>
        </div>
        <div class="card small">
          <span class="label">{{ labels.title('SV') }}</span>
          <p [class]="'figure tone-' + (indicators.scheduleVariance < 0 ? 'warning' : 'success')">
            {{ money(indicators.scheduleVariance) }}
          </p>
        </div>
      </div>
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
    } @else if (!isDesktop()) {
      <!-- Lista de tarjetas: la tabla de siete columnas no cabe en una pantalla estrecha. -->
      <div class="mobile-bar">
        <span class="count">{{ countLabel() }}</span>
        <button type="button" class="primary" (click)="openCreate()">+ Nueva</button>
      </div>
      <ul class="cards">
        @for (row of rows(); track row.activity.id) {
          <li>
            <button type="button" (click)="openDetail(row.activity.id)">
              <span class="card-head">
                <span class="title">{{ row.activity.name }}</span>
                <span class="badges">
                  <span class="badge" [class]="'tone-' + row.costTone">
                    <app-index-value
                      [value]="row.activity.indicators.costPerformanceIndex"
                      [tone]="row.costTone"
                    />
                  </span>
                  <span class="badge" [class]="'tone-' + row.scheduleTone">
                    <app-index-value
                      [value]="row.activity.indicators.schedulePerformanceIndex"
                      [tone]="row.scheduleTone"
                    />
                  </span>
                </span>
              </span>
              <app-dual-progress
                [planned]="row.activity.plannedProgressPercent"
                [actual]="row.activity.actualProgressPercent"
              />
            </button>
          </li>
        }
      </ul>
    } @else {
      <div class="card table">
        <div class="table-bar">
          <span class="count">{{ countLabel() }}</span>
          <button type="button" class="primary" (click)="openCreate()">+ Nueva actividad</button>
        </div>
        <div class="grid" role="table" aria-label="Actividades del proyecto">
          <div class="row head" role="row">
            <span role="columnheader">Actividad</span>
            <span role="columnheader">{{ labels.title('BAC') }}</span>
            <span role="columnheader">Avance</span>
            <span role="columnheader">{{ labels.title('AC') }}</span>
            <span role="columnheader">{{ labels.short('CPI') }}</span>
            <span role="columnheader">{{ labels.short('SPI') }}</span>
            <span role="columnheader">Estado</span>
          </div>
          @for (row of rows(); track row.activity.id) {
            <!--
            La fila entera responde al puntero por comodidad; el camino accesible es el botón del
            nombre, que recibe el foco y cuyo Enter sube hasta aquí como clic.
            -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <div class="row clickable" role="row" (click)="openDetail(row.activity.id)">
              <div class="name-cell" role="cell">
                <span class="rail" [class]="'tone-' + row.tone" aria-hidden="true"></span>
                <!-- Sin manejador propio: su clic sube a la fila, y sigue siendo el foco de teclado. -->
                <button type="button" class="name">
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
                <app-row-tools
                  [name]="row.activity.name"
                  (edit)="openEdit(row.activity)"
                  (remove)="confirmRemove(row.activity)"
                />
              </span>
            </div>
          }
        </div>
      </div>
    }

    @if (evm.hasActivities()) {
      <section class="card comparison">
        <h2>
          {{ labels.short('PV') }} · {{ labels.short('EV') }} · {{ labels.short('AC') }} por
          actividad
        </h2>
        <p class="lead">
          Cada actividad con sus tres cifras en dinero sobre una misma escala: una barra de
          {{ labels.short('AC') }} por encima de la de {{ labels.short('EV') }} es una actividad que
          gasta más de lo que gana, y una de {{ labels.short('EV') }} por debajo de la de
          {{ labels.short('PV') }} va por detrás de lo previsto.
        </p>
        <app-activity-bars
          [activities]="evm.activityList()"
          [plannedLabel]="labels.short('PV')"
          [earnedLabel]="labels.short('EV')"
          [actualCostLabel]="labels.short('AC')"
        />
      </section>
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
    .anchor {
      position: relative;
    }
    .status-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 220px;
      padding: 8px;
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      animation: valora-pop 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    .status-menu button {
      border: none;
      border-radius: 12px;
      background: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 14px;
      text-align: left;
    }
    .status-menu button:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
    }
    .status-menu button.active {
      background: rgba(139, 111, 224, 0.12);
      color: var(--text);
    }
    .table-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 12px 12px 18px;
    }
    .count {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .grid {
      overflow-x: auto;
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
      margin-top: var(--gap-grid);
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
    /*
     * Cada fila es su propia rejilla, así que las pistas llevan un mínimo de cero: sin él, el
     * contenido más ancho de cada fila (un distintivo largo, un nombre) ensanchaba su columna
     * solo en esa fila y las columnas dejaban de coincidir entre filas.
     */
    .row {
      position: relative;
      display: grid;
      grid-template-columns:
        minmax(0, 2.2fr) minmax(0, 0.85fr) minmax(0, 1.45fr) minmax(0, 0.95fr) minmax(0, 0.75fr)
        minmax(0, 0.75fr) minmax(0, 1.8fr);
      gap: 14px;
      align-items: center;
      padding: 14px 12px;
      border-radius: var(--radius-tile);
      min-width: 1000px;
      transition: background var(--motion-veil);
    }
    .row > * {
      min-width: 0;
    }
    /* Las herramientas flotan sobre el borde derecho: no reservan hueco mientras están ocultas. */
    .row app-row-tools {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
    }
    .row.clickable {
      cursor: pointer;
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
      min-width: 0;
    }
    .mobile-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }
    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .cards > li > button {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 18px;
      margin-bottom: 12px;
      text-align: left;
      transition: border-color var(--motion-border);
    }
    .cards > li > button:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .card-head .title {
      font-size: 14.5px;
      font-weight: 700;
    }
    .badges {
      display: flex;
      gap: 6px;
      flex: none;
    }
    .badge {
      border-radius: 9px;
      padding: 5px 9px;
      font-size: 13px;
    }
    .badge.tone-success {
      background: var(--ok-soft);
    }
    .badge.tone-warning {
      background: var(--warning-soft);
    }
    .badge.tone-danger {
      background: var(--danger-soft);
    }
    .badge.tone-neutral {
      background: var(--neutral-soft);
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
  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  private readonly preferences = inject(PreferencesStore);
  private readonly selection = inject(SelectedProjectStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly money = formatMoneyRounded;
  protected readonly compact = formatCompact;
  protected readonly placeholders = [0, 1, 2, 3];

  private readonly projects = inject(ProjectSummariesStore);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Activity | null>(null);
  protected readonly pickerOpen = signal(false);

  protected readonly statusOptions: readonly { value: StatusFilter; label: string }[] = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'riesgo', label: 'En riesgo' },
    { value: 'al-dia', label: 'Al día' },
    { value: 'sin-datos', label: 'Sin costo registrado' },
  ];
  protected readonly statusFilter = signal<StatusFilter>('todos');
  protected readonly statusMenuOpen = signal(false);

  protected readonly statusFilterLabel = computed(
    () =>
      this.statusOptions.find((option) => option.value === this.statusFilter())?.label ??
      'Todos los estados',
  );

  protected readonly lastCutoffShort = computed(() => {
    const last = this.evm.timeline().at(-1);
    return last === undefined ? null : formatShortDate(last.cutoffDate);
  });

  protected readonly countLabel = computed(() => {
    const shown = this.rows().length;
    const total = this.evm.activityList().length;
    const noun = total === 1 ? 'actividad' : 'actividades';
    return shown === total ? `${total} ${noun}` : `${shown} de ${total} ${noun}`;
  });

  /**
   * Sigue a la ruta, no a su instantánea: al elegir otro proyecto desde el selector el enrutador
   * reutiliza este componente y solo cambia el parámetro.
   */
  protected readonly projectId = toSignal(
    this.route.paramMap.pipe(map((params) => parseId(params.get('projectId')))),
    { initialValue: parseId(this.route.snapshot.paramMap.get('projectId')) },
  );

  protected readonly pickerOptions = computed<readonly PickerOption[]>(() =>
    this.projects.rows().map((row) => ({
      project: row.project,
      meta: row.meta,
      costPerformanceIndex: row.costPerformanceIndex,
      schedulePerformanceIndex: row.schedulePerformanceIndex,
      costTone: row.costTone,
      scheduleTone: row.scheduleTone,
    })),
  );

  protected readonly projectName = computed(() => this.evm.summary()?.project.name ?? 'Proyecto');

  private readonly allRows = computed(() => {
    const dateFormat = this.preferences.preferences().dateFormat;
    return this.evm.activityList().map((activity) => ({
      activity,
      dates: formatDateRange(activity.plannedStartDate, activity.plannedEndDate, dateFormat),
      costTone: costTone(activity.indicators),
      scheduleTone: scheduleTone(activity.indicators),
      statusLabel: combinedStatusLabel(activity.indicators),
      tone: overallTone(activity.indicators),
    }));
  });

  /**
   * Filtro por salud de la actividad.
   *
   * Se apoya en el estado que devuelve el servidor. "Sin costo registrado" es una categoría propia
   * y no un caso de riesgo: que falte el dato no significa que la actividad vaya mal.
   */
  protected readonly rows = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'todos') {
      return this.allRows();
    }
    return this.allRows().filter((row) => {
      if (row.tone === 'neutral') {
        return filter === 'sin-datos';
      }
      const atRisk = row.tone === 'danger' || row.tone === 'warning';
      return filter === 'riesgo' ? atRisk : filter === 'al-dia' && !atRisk;
    });
  });

  constructor() {
    // El botón "+" de la barra superior abre el alta desde cualquier vista pasando ?nueva=1.
    if (this.route.snapshot.queryParamMap.has('nueva')) {
      this.formOpen.set(true);
    }
    effect(() => {
      const projectId = this.projectId();
      this.evm.select(projectId);
      if (projectId !== undefined) {
        this.selection.select(projectId);
      }
    });
  }

  protected choose(projectId: number): void {
    this.pickerOpen.set(false);
    this.statusFilter.set('todos');
    void this.router.navigate(['/proyectos', projectId, 'actividades']);
  }

  protected chooseStatus(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.statusMenuOpen.set(false);
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
