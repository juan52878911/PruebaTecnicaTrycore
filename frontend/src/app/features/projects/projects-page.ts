import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Project, ProjectRequest } from '../../core/api/models/project';
import { ProjectsApi } from '../../core/api/projects-api';
import { formatMoneyRounded } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import { ChipButton } from '../../shared/ui/chip-button';
import { ChipOption } from '../../shared/ui/chip-group';
import { EmptyState } from '../../shared/ui/empty-state';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { PageHeader } from '../../shared/ui/page-header';
import { RowTools } from '../../shared/ui/row-tools';
import { IndexValue } from '../../shared/ui/index-value';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { ProjectFormDialog } from './project-form-dialog';
import { ProjectSummariesStore } from './project-summaries-store';
import { ProjectsStore } from './projects-store';

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
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  imports: [
    RowTools,
    ChipButton,
    EmptyState,
    IndexValue,
    PageHeader,
    ProjectFormDialog,
    Skeleton,
    StatusBadge,
  ],
  template: `
    <app-page-header title="Proyectos" [subtitle]="countLabel()" mobileTitle="Proyectos">
      <div class="anchor">
        <app-chip-button
          [label]="filterLabel()"
          [open]="filterMenuOpen()"
          (pressed)="filterMenuOpen.set(!filterMenuOpen())"
        />
        @if (filterMenuOpen()) {
          <div class="filter-menu" role="radiogroup" aria-label="Filtrar proyectos">
            @for (option of filterOptions; track option.value) {
              <button
                type="button"
                role="radio"
                [class.active]="option.value === filter()"
                [attr.aria-checked]="option.value === filter()"
                (click)="chooseFilter(option.value)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        }
      </div>
      <button type="button" class="primary" (click)="openCreate()">+ Nuevo proyecto</button>
    </app-page-header>

    @if (error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (summaries.isLoading() && rows().length === 0) {
      <div class="card">
        @for (placeholder of placeholders; track placeholder) {
          <div class="skeleton-row">
            <app-skeleton width="40%" [height]="16" />
            <app-skeleton width="70%" [height]="12" />
          </div>
        }
      </div>
    } @else if (isEmpty()) {
      <app-empty-state
        title="Aún no hay proyectos"
        description="Crea el primer proyecto para empezar a registrar actividades y analizar su Valor Ganado."
        actionLabel="Nuevo proyecto"
        (action)="openCreate()"
      />
    } @else if (!isDesktop()) {
      <!-- En móvil la tabla se convierte en una lista de tarjetas: siete columnas no caben en
           390 px sin obligar a desplazar en horizontal. -->
      <ul class="cards">
        @for (row of visibleRows(); track row.project.id) {
          <li>
            <button type="button" (click)="openActivities(row.project.id)">
              <span class="card-head">
                <span class="card-text">
                  <span class="title">{{ row.project.name }}</span>
                  <span class="meta">{{ row.meta }}</span>
                </span>
                <app-status-badge [label]="row.statusLabel" [tone]="row.statusTone" />
              </span>
              <span class="card-indices">
                <span class="pair">
                  {{ labels.short('CPI') }}
                  <app-index-value [value]="row.costPerformanceIndex" [tone]="row.costTone" />
                </span>
                <span class="pair">
                  {{ labels.short('SPI') }}
                  <app-index-value
                    [value]="row.schedulePerformanceIndex"
                    [tone]="row.scheduleTone"
                  />
                </span>
              </span>
            </button>
          </li>
        }
      </ul>
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
          <!--
          La fila entera responde al puntero por comodidad; el camino accesible es el botón del
          nombre, que recibe el foco y cuyo Enter sube hasta aquí como clic.
          -->
          <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
          <div class="row clickable" role="row" (click)="openActivities(row.project.id)">
            <!-- Sin manejador propio: su clic sube a la fila, y sigue siendo el foco de teclado. -->
            <button type="button" class="name" role="cell">
              <span class="title">{{ row.project.name }}</span>
              <span class="meta">{{ row.meta }}</span>
            </button>
            <span class="tabular" role="cell">{{ row.budgetLabel }}</span>
            <span class="tabular" role="cell">{{ row.earnedLabel }}</span>
            <span class="tabular" role="cell">{{ row.costLabel }}</span>
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
              <app-row-tools
                [name]="row.project.name"
                (edit)="openEdit(row.project)"
                (remove)="confirmRemove(row.project)"
              />
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
    .anchor {
      position: relative;
    }
    .filter-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 200px;
      padding: 8px;
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      animation: vPop 0.2s cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    .filter-menu button {
      border: none;
      border-radius: 12px;
      background: none;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 14px;
      text-align: left;
    }
    .filter-menu button:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
    }
    .filter-menu button.active {
      background: rgba(139, 111, 224, 0.12);
      color: var(--text);
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
      position: relative;
      grid-template-columns:
        minmax(0, 2.2fr) minmax(0, 0.95fr) minmax(0, 0.95fr) minmax(0, 0.95fr) minmax(0, 0.7fr)
        minmax(0, 0.7fr) minmax(0, 1.85fr);
      gap: 14px;
      align-items: center;
      padding: 14px 12px;
      border-radius: var(--radius-tile);
      min-width: 900px;
      transition: background var(--motion-veil);
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
      min-width: 0;
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
    /* Las herramientas de fila aparecen al apuntar: el diseño deja la fila limpia. Siguen siendo
       alcanzables con el teclado gracias a focus-within. */
    .cards {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .cards button {
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
    .cards button:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    .card-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .card-head .title {
      font-size: 15px;
      font-weight: 700;
    }
    .card-indices {
      display: flex;
      gap: 26px;
    }
    .pair {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-dim);
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
  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  private readonly projectsApi = inject(ProjectsApi);
  private readonly selection = inject(SelectedProjectStore);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly emptyCell = EMPTY_CELL;
  protected readonly placeholders = [0, 1, 2, 3];

  protected readonly summaries = inject(ProjectSummariesStore);
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Project | null>(null);

  protected readonly filterOptions: readonly ChipOption<ProjectFilter>[] = [
    { value: 'todos', label: 'Todos los estados' },
    { value: 'riesgo', label: 'En riesgo' },
    { value: 'al-dia', label: 'Al día' },
  ];
  protected readonly filter = signal<ProjectFilter>('todos');
  protected readonly filterMenuOpen = signal(false);

  protected readonly filterLabel = computed(
    () =>
      this.filterOptions.find((option) => option.value === this.filter())?.label ??
      'Todos los estados',
  );

  /**
   * Filas del listado.
   *
   * Salen del store compartido, que pide el consolidado de cada proyecto una sola vez. Antes esta
   * página tenía su propia ráfaga y el perfil otra, para los mismos datos.
   */
  protected readonly rows = computed(() =>
    this.summaries.rows().map((row) => ({
      ...row,
      budgetLabel: row.hasData ? formatMoneyRounded(row.budgetAtCompletion) : EMPTY_CELL,
      earnedLabel: row.hasData ? formatMoneyRounded(row.earnedValue) : EMPTY_CELL,
      costLabel: row.hasData ? formatMoneyRounded(row.actualCost) : EMPTY_CELL,
    })),
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

  protected chooseFilter(value: ProjectFilter): void {
    this.filter.set(value);
    this.filterMenuOpen.set(false);
  }

  protected readonly filterCountLabel = computed(() => {
    const shown = this.visibleRows().length;
    const total = this.rows().length;
    return shown === 1 ? `1 de ${total} proyectos` : `${shown} de ${total} proyectos`;
  });

  protected readonly countLabel = computed(() => {
    const total = this.rows().length;
    return total === 1 ? '1 activo' : `${total} activos`;
  });

  /** El fallo de lectura y el de escritura salen por el mismo aviso. */
  protected readonly error = computed(() => this.summaries.error() ?? this.store.error());
  protected readonly isEmpty = computed(
    () => !this.summaries.isLoading() && this.rows().length === 0,
  );

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
    }
  }
}
