import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Project, ProjectRequest } from '../../core/api/models/project';
import { ProjectsApi } from '../../core/api/projects-api';
import { formatMoneyRounded } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import {
  combinedStatusLabel,
  costTone,
  overallTone,
  scheduleTone,
  Tone,
} from '../../core/status/status-tone';
import { ChipGroup, ChipOption } from '../../shared/ui/chip-group';
import { EmptyState } from '../../shared/ui/empty-state';
import { PageHeader } from '../../shared/ui/page-header';
import { IndexValue } from '../../shared/ui/index-value';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { ProjectFormDialog } from './project-form-dialog';
import { ProjectsStore } from './projects-store';

interface ProjectRow {
  readonly project: Project;
  readonly meta: string;
  readonly budgetAtCompletion: string;
  readonly earnedValue: string;
  readonly actualCost: string;
  readonly costPerformanceIndex: number | null;
  readonly schedulePerformanceIndex: number | null;
  readonly costTone: Tone;
  readonly scheduleTone: Tone;
  readonly statusLabel: string;
  readonly statusTone: Tone;
  readonly hasData: boolean;
}

type ProjectFilter = 'todos' | 'riesgo' | 'al-dia';

const EMPTY_CELL = '—';

/**
 * Listado de proyectos con sus indicadores consolidados.
 *
 * `GET /projects` devuelve solo los datos del proyecto, sin cifras, así que la tabla pide el
 * consolidado de cada uno en paralelo. Con la cantidad de proyectos que maneja esta herramienta es
 * irrelevante; si la lista creciera, lo correcto sería un endpoint consolidado en el backend, no
 * multiplicar las peticiones desde el navegador. Queda anotado en AI_PROCESS.md.
 */
@Component({
  selector: 'app-projects-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ChipGroup,
    EmptyState,
    IndexValue,
    PageHeader,
    ProjectFormDialog,
    Skeleton,
    StatusBadge,
  ],
  template: `
    <app-page-header title="Proyectos" [subtitle]="countLabel()">
      <button type="button" class="primary" (click)="openCreate()">+ Nuevo proyecto</button>
    </app-page-header>

    @if (store.error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (rows().length > 0) {
      <div class="filters">
        <app-chip-group label="Filtrar proyectos" [options]="filterOptions" [(selected)]="filter" />
        @if (filter() !== 'todos') {
          <span class="filter-count">{{ filterCountLabel() }}</span>
        }
      </div>
    }

    @if (store.isLoading() && rows().length === 0) {
      <div class="card">
        @for (placeholder of placeholders; track placeholder) {
          <div class="skeleton-row">
            <app-skeleton width="40%" [height]="16" />
            <app-skeleton width="70%" [height]="12" />
          </div>
        }
      </div>
    } @else if (store.isEmpty()) {
      <app-empty-state
        title="Aún no hay proyectos"
        description="Crea el primer proyecto para empezar a registrar actividades y analizar su Valor Ganado."
        actionLabel="Nuevo proyecto"
        (action)="openCreate()"
      />
    } @else {
      <div class="card table" role="table" aria-label="Proyectos con sus indicadores">
        <div class="row head" role="row">
          <span role="columnheader">Proyecto</span>
          <span role="columnheader">{{ labels.short('BAC') }}</span>
          <span role="columnheader">{{ labels.short('EV') }}</span>
          <span role="columnheader">{{ labels.short('AC') }}</span>
          <span role="columnheader">{{ labels.short('CPI') }}</span>
          <span role="columnheader">{{ labels.short('SPI') }}</span>
          <span role="columnheader">Estado</span>
        </div>
        @for (row of visibleRows(); track row.project.id) {
          <div class="row" role="row">
            <button type="button" class="name" role="cell" (click)="openActivities(row.project.id)">
              <span class="title">{{ row.project.name }}</span>
              <span class="meta">{{ row.meta }}</span>
            </button>
            <span class="tabular" role="cell">{{ row.budgetAtCompletion }}</span>
            <span class="tabular" role="cell">{{ row.earnedValue }}</span>
            <span class="tabular" role="cell">{{ row.actualCost }}</span>
            <span role="cell">
              @if (row.hasData) {
                <app-index-value [value]="row.costPerformanceIndex" [tone]="row.costTone" />
              } @else {
                <span class="dim">{{ emptyCell }}</span>
              }
            </span>
            <span role="cell">
              @if (row.hasData) {
                <app-index-value [value]="row.schedulePerformanceIndex" [tone]="row.scheduleTone" />
              } @else {
                <span class="dim">{{ emptyCell }}</span>
              }
            </span>
            <span class="actions" role="cell">
              <app-status-badge [label]="row.statusLabel" [tone]="row.statusTone" />
              <button type="button" class="icon" (click)="openEdit(row.project)" title="Editar">
                Editar
              </button>
              <button type="button" class="icon danger" (click)="confirmRemove(row.project)">
                Borrar
              </button>
            </span>
          </div>
        }
      </div>
    }

    @if (formOpen()) {
      <app-project-form-dialog
        [project]="editing()"
        [serverError]="store.error()"
        (save)="persist($event)"
        (dismissed)="closeForm()"
      />
    }
  `,
  styles: `
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
    .filters {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .filter-count {
      font-size: 12.5px;
      color: var(--text-dim);
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
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: 8px 14px 14px;
      overflow-x: auto;
    }
    .row {
      display: grid;
      grid-template-columns: 2.2fr 1fr 1fr 1fr 0.8fr 0.8fr 1.4fr;
      gap: 14px;
      align-items: center;
      padding: 14px 12px;
      border-radius: var(--radius-tile);
      min-width: 900px;
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
    .dim {
      color: var(--text-faint);
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
  `,
})
export class ProjectsPage {
  protected readonly store = inject(ProjectsStore);
  protected readonly labels = inject(IndicatorLabels);
  private readonly projectsApi = inject(ProjectsApi);
  private readonly selection = inject(SelectedProjectStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly emptyCell = EMPTY_CELL;
  protected readonly placeholders = [0, 1, 2, 3];

  private readonly summaries = signal<ReadonlyMap<number, ProjectRow>>(new Map());
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Project | null>(null);

  protected readonly filterOptions: readonly ChipOption<ProjectFilter>[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'riesgo', label: 'En riesgo' },
    { value: 'al-dia', label: 'Al día' },
  ];
  protected readonly filter = signal<ProjectFilter>('todos');

  protected readonly rows = computed(() =>
    this.store
      .projects()
      .map((project) => this.summaries().get(project.id) ?? this.pendingRow(project)),
  );

  /**
   * Filtro por salud del proyecto.
   *
   * Se apoya en el estado que devuelve el servidor, no en un umbral del cliente: "en riesgo" es lo
   * que el backend marca como sobre presupuesto o atrasado. Un proyecto sin datos no es ninguna de
   * las dos cosas, así que solo aparece en "Todos".
   */
  protected readonly visibleRows = computed(() => {
    const filter = this.filter();
    if (filter === 'todos') {
      return this.rows();
    }
    return this.rows().filter((row) => {
      if (!row.hasData) {
        return false;
      }
      const atRisk = row.statusTone === 'danger' || row.statusTone === 'warning';
      return filter === 'riesgo' ? atRisk : !atRisk;
    });
  });

  protected readonly filterCountLabel = computed(() => {
    const shown = this.visibleRows().length;
    const total = this.rows().length;
    return shown === 1 ? `1 de ${total} proyectos` : `${shown} de ${total} proyectos`;
  });

  protected readonly countLabel = computed(() => {
    const total = this.store.projects().length;
    return total === 1 ? '1 activo' : `${total} activos`;
  });

  constructor() {
    // La lista llega de forma asíncrona, así que el consolidado se pide cuando cambia, no una
    // sola vez en el constructor: ahí todavía está vacía.
    effect(() => {
      const projects = this.store.projects();
      void this.loadSummaries(projects);
    });
  }

  protected openCreate(): void {
    this.store.clearError();
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(project: Project): void {
    this.store.clearError();
    this.editing.set(project);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.store.clearError();
  }

  protected openActivities(projectId: number): void {
    this.selection.select(projectId);
    void this.router.navigate(['/proyectos', projectId, 'actividades']);
  }

  protected async persist(request: ProjectRequest): Promise<void> {
    const existing = this.editing();
    const saved =
      existing === null
        ? await this.store.create(request)
        : await this.store.update(existing.id, request);
    if (saved === null) {
      return;
    }
    this.formOpen.set(false);
    this.editing.set(null);
    this.toasts.success(
      existing === null ? 'Proyecto creado' : 'Proyecto actualizado',
      `${saved.name}. Los indicadores se recalculan al leerlos.`,
    );
    await this.loadSummaries(this.store.projects());
  }

  protected async confirmRemove(project: Project): Promise<void> {
    // Un borrado en cascada se lleva por delante las actividades y el histórico del proyecto, así
    // que se confirma antes.
    const confirmed = globalThis.confirm(
      `¿Borrar "${project.name}"? Se eliminarán también sus actividades y sus cortes.`,
    );
    if (!confirmed) {
      return;
    }
    if (await this.store.remove(project.id)) {
      this.toasts.info('Proyecto borrado', `${project.name} ya no aparece en el listado.`);
      await this.loadSummaries(this.store.projects());
    }
  }

  private pendingRow(project: Project): ProjectRow {
    return {
      project,
      meta: project.description ?? 'Sin descripción',
      budgetAtCompletion: EMPTY_CELL,
      earnedValue: EMPTY_CELL,
      actualCost: EMPTY_CELL,
      costPerformanceIndex: null,
      schedulePerformanceIndex: null,
      costTone: 'neutral',
      scheduleTone: 'neutral',
      statusLabel: 'Sin datos',
      statusTone: 'neutral',
      hasData: false,
    };
  }

  private async loadSummaries(projects: readonly Project[]): Promise<void> {
    if (projects.length === 0) {
      this.summaries.set(new Map());
      return;
    }
    const entries = await Promise.all(
      projects.map(async (project): Promise<[number, ProjectRow] | null> => {
        try {
          const summary = await this.projectsApi.evmSummary(project.id);
          const indicators = summary.indicators;
          const hasData = summary.activities.length > 0;
          return [
            project.id,
            {
              project,
              meta: `${summary.activities.length} actividades`,
              budgetAtCompletion: hasData
                ? formatMoneyRounded(summary.budgetAtCompletion)
                : EMPTY_CELL,
              earnedValue: hasData ? formatMoneyRounded(indicators.earnedValue) : EMPTY_CELL,
              actualCost: hasData ? formatMoneyRounded(indicators.actualCost) : EMPTY_CELL,
              costPerformanceIndex: indicators.costPerformanceIndex,
              schedulePerformanceIndex: indicators.schedulePerformanceIndex,
              costTone: costTone(indicators.costStatus.status),
              scheduleTone: scheduleTone(indicators.scheduleStatus.status),
              statusLabel: hasData ? combinedStatusLabel(indicators) : 'Sin datos',
              statusTone: hasData ? overallTone(indicators) : 'neutral',
              hasData,
            },
          ];
        } catch {
          // Un proyecto cuyo consolidado falla no debe tumbar la tabla entera: se queda con la
          // fila a la espera y el resto se pinta.
          return null;
        }
      }),
    );
    this.summaries.set(
      new Map(entries.filter((entry): entry is [number, ProjectRow] => entry !== null)),
    );
  }
}
