import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { MeasurementRequest } from '../../core/api/models/measurement';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { formatDate, formatMoneyRounded, formatPercent } from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import { costTone, scheduleTone } from '../../core/status/status-tone';
import { EmptyState } from '../../shared/ui/empty-state';
import { GroupedBars } from '../../shared/ui/grouped-bars';
import { IndexCard } from '../../shared/ui/index-card';
import { KpiCard } from '../../shared/ui/kpi-card';
import { OverallStatus } from '../../shared/ui/overall-status';
import { SCurve } from '../../shared/ui/s-curve';
import { Skeleton } from '../../shared/ui/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { Dialog } from '../../shared/ui/dialog';
import { MeasurementDialog } from '../evm/measurement-dialog';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { ProjectPicker } from '../evm/project-picker';
import { ProjectsStore } from '../projects/projects-store';

const PERCENT_BASE = 100;

/** Panel del proyecto: cifras, índices, curva S y actividades en riesgo. */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectEvmStore],
  imports: [
    Dialog,
    EmptyState,
    GroupedBars,
    IndexCard,
    KpiCard,
    MeasurementDialog,
    OverallStatus,
    ProjectPicker,
    SCurve,
    Skeleton,
    StatusBadge,
  ],
  template: `
    <header class="page-header">
      <div>
        <h1>
          {{ projectName() }}
        </h1>
        <p class="lead">Análisis de Valor Ganado a la fecha del último corte.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="chip" (click)="pickerOpen.set(true)">
          Cambiar de proyecto
        </button>
        @if (selectedId()) {
          <button type="button" class="chip" (click)="measurementOpen.set(true)">
            Registrar corte
          </button>
        }
      </div>
    </header>

    @if (evm.error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (!selectedId()) {
      <app-empty-state
        title="Ningún proyecto seleccionado"
        description="Elige un proyecto para ver sus indicadores de Valor Ganado."
        actionLabel="Elegir proyecto"
        (action)="pickerOpen.set(true)"
      />
    } @else if (evm.isLoading() && !evm.summary()) {
      <div class="grid">
        @for (placeholder of placeholders; track placeholder) {
          <div class="card">
            <app-skeleton width="46%" [height]="13" />
            <app-skeleton width="70%" [height]="34" />
            <app-skeleton width="38%" [height]="11" />
          </div>
        }
      </div>
    } @else if (!evm.hasActivities()) {
      <app-empty-state
        title="Aún no hay actividades"
        description="Sin actividades registradas no es posible calcular PV, EV ni los índices del proyecto. Agrega la primera para empezar el análisis."
        actionLabel="Ir a actividades"
        (action)="goToActivities()"
      />
    } @else if (evm.indicators(); as indicators) {
      @if (!isDesktop()) {
        <div class="mobile">
          <app-overall-status [indicators]="indicators" [cutoffLabel]="lastCutoffLabel()" />

          <div class="pair">
            <app-index-card
              [title]="labels.short('CPI')"
              [value]="indicators.costPerformanceIndex"
              [message]="indicators.costStatus.message"
              [tone]="costTone(indicators.costStatus.status)"
            />
            <app-index-card
              [title]="labels.short('SPI')"
              [value]="indicators.schedulePerformanceIndex"
              [message]="indicators.scheduleStatus.message"
              [tone]="scheduleTone(indicators.scheduleStatus.status)"
            />
          </div>

          <section class="card chart">
            <header class="chart-head">
              <div>
                <h2>Curva S</h2>
                <p class="chart-lead">{{ timelineLead() }}</p>
              </div>
              @if (lastCutoffLabel()) {
                <span class="cut-chip">Corte: {{ lastCutoffLabel() }}</span>
              }
            </header>
            <div class="curve-summary">
              <div>
                <p class="curve-figure accent">{{ money(indicators.earnedValue) }}</p>
                <p class="curve-caption">ganado a la fecha</p>
              </div>
              <div class="right">
                <p
                  [class]="
                    'curve-figure tone-' + (indicators.scheduleVariance < 0 ? 'warning' : 'success')
                  "
                >
                  {{ money(indicators.scheduleVariance) }}
                </p>
                <p class="curve-caption">
                  {{
                    indicators.scheduleVariance < 0 ? 'por debajo del plan' : 'por encima del plan'
                  }}
                </p>
              </div>
            </div>
            @if (evm.hasTimeline()) {
              <app-s-curve
                [points]="evm.timeline()"
                [plannedLabel]="labels.short('PV')"
                [earnedLabel]="labels.short('EV')"
                [actualCostLabel]="labels.short('AC')"
              />
            } @else {
              <app-empty-state
                title="Sin curva S todavía"
                description="La curva se dibuja con los cortes registrados. Registra el primero para ver la evolución del proyecto en el tiempo."
                actionLabel="Registrar corte"
                (action)="measurementOpen.set(true)"
              />
            }
          </section>
        </div>
      } @else {
        <div class="grid">
          <div class="column">
            <app-kpi-card
              [title]="labels.title('PV')"
              [acronym]="labels.showAcronymBadge() ? 'PV' : null"
              [value]="indicators.plannedValue"
              unit="USD"
              [footnote]="plannedShare()"
            />
            <app-kpi-card
              [title]="labels.title('EV')"
              [acronym]="labels.showAcronymBadge() ? 'EV' : null"
              [value]="indicators.earnedValue"
              unit="USD"
              [footnote]="earnedShare()"
            />
            <app-kpi-card
              [title]="labels.title('AC')"
              [acronym]="labels.showAcronymBadge() ? 'AC' : null"
              [value]="indicators.actualCost"
              unit="USD"
              [footnote]="costGap()"
              [footnoteTone]="indicators.costVariance < 0 ? 'danger' : 'success'"
            />
          </div>

          <div class="column">
            <app-index-card
              [title]="labels.title('CPI')"
              [acronym]="labels.showAcronymBadge() ? 'CPI' : null"
              [value]="indicators.costPerformanceIndex"
              [message]="indicators.costStatus.message"
              [tone]="costTone(indicators.costStatus.status)"
            />
            <app-index-card
              [title]="labels.title('SPI')"
              [acronym]="labels.showAcronymBadge() ? 'SPI' : null"
              [value]="indicators.schedulePerformanceIndex"
              [message]="indicators.scheduleStatus.message"
              [tone]="scheduleTone(indicators.scheduleStatus.status)"
            />
            <div class="card variances">
              <div>
                <span class="label">{{ labels.short('CV') }}</span>
                <p [class]="'figure tone-' + (indicators.costVariance < 0 ? 'danger' : 'success')">
                  {{ money(indicators.costVariance) }}
                </p>
              </div>
              <div>
                <span class="label">{{ labels.short('SV') }}</span>
                <p
                  [class]="
                    'figure tone-' + (indicators.scheduleVariance < 0 ? 'warning' : 'success')
                  "
                >
                  {{ money(indicators.scheduleVariance) }}
                </p>
              </div>
            </div>
          </div>

          <div class="column wide">
            <section class="card chart">
              <header class="chart-head">
                <div>
                  <h2>Curva S del proyecto</h2>
                  <p class="chart-lead">{{ timelineLead() }}</p>
                </div>
              </header>
              @if (evm.hasTimeline()) {
                <app-s-curve
                  [points]="evm.timeline()"
                  [plannedLabel]="labels.short('PV')"
                  [earnedLabel]="labels.short('EV')"
                  [actualCostLabel]="labels.short('AC')"
                />
              } @else {
                <app-empty-state
                  title="Sin curva S todavía"
                  description="La curva se dibuja con los cortes registrados. Registra el primero para empezar a ver la evolución del proyecto en el tiempo."
                  actionLabel="Registrar corte"
                  (action)="measurementOpen.set(true)"
                />
              }
            </section>

            <div class="closing">
              <div class="card small">
                <span class="label">{{ labels.short('EAC') }}</span>
                <p class="figure">{{ money(indicators.estimateAtCompletion) }}</p>
              </div>
              <div class="card small">
                <span class="label">{{ labels.short('VAC') }}</span>
                <p
                  [class]="
                    'figure tone-' +
                    ((indicators.varianceAtCompletion ?? 0) < 0 ? 'danger' : 'success')
                  "
                >
                  {{ money(indicators.varianceAtCompletion) }}
                </p>
              </div>
              <div class="card small">
                <span class="label">{{ labels.short('BAC') }}</span>
                <p class="figure">{{ money(evm.budgetAtCompletion()) }}</p>
              </div>
            </div>
          </div>
        </div>

        @if (evm.hasTimeline()) {
          <section class="card comparison">
            <header class="chart-head">
              <div>
                <h2>
                  {{ labels.short('PV') }} · {{ labels.short('EV') }} · {{ labels.short('AC') }}
                  por corte
                </h2>
                <p class="chart-lead">
                  La curva muestra la tendencia; esta comparativa, la distancia entre las tres
                  series en cada corte.
                </p>
              </div>
            </header>
            <app-grouped-bars
              [points]="evm.timeline()"
              [plannedLabel]="labels.short('PV')"
              [earnedLabel]="labels.short('EV')"
              [actualCostLabel]="labels.short('AC')"
            />
          </section>
        }
      }

      @if (evm.activitiesAtRisk().length > 0) {
        <section class="card risk">
          <h2>Actividades en riesgo</h2>
          <p class="chart-lead">
            Índice por debajo de {{ warningLabel() }}; crítica por debajo de {{ criticalLabel() }}.
          </p>
          <ul>
            @for (entry of evm.activitiesAtRisk(); track entry.activity.id) {
              <li>
                <button type="button" (click)="goToActivity(entry.activity.id)">
                  <span class="risk-name">{{ entry.activity.name }}</span>
                  <app-status-badge
                    [label]="entry.risk === 'critical' ? 'Crítica' : 'En riesgo'"
                    [tone]="entry.risk === 'critical' ? 'danger' : 'warning'"
                  />
                </button>
              </li>
            }
          </ul>
        </section>
      }
    }

    @if (pickerOpen()) {
      <app-dialog
        title="Cambiar de proyecto"
        subtitle="El panel y las actividades se recalculan al elegir."
        (dismiss)="pickerOpen.set(false)"
      >
        <app-project-picker
          [projects]="projects.projects()"
          [selectedId]="selectedId()"
          (choose)="choose($event)"
        />
        <ng-container dialogActions>
          <button type="button" class="secondary" (click)="pickerOpen.set(false)">Cancelar</button>
        </ng-container>
      </app-dialog>
    }

    @if (measurementOpen()) {
      <app-measurement-dialog
        [serverError]="evm.error()"
        (save)="registerMeasurement($event)"
        (dismissed)="closeMeasurement()"
      />
    }
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 26px;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0;
      font-size: 46px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.035em;
    }
    .lead {
      margin: 10px 0 0;
      font-size: 13px;
      color: var(--text-dim);
    }
    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .chip {
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
      background: var(--control);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 18px;
    }
    .chip:hover {
      background: var(--control-hover);
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
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1.72fr;
      gap: var(--gap-grid);
      align-items: start;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: var(--gap-grid);
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: var(--pad-card);
    }
    .variances {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .label {
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.07em;
      color: var(--text-dim);
    }
    .figure {
      margin: 10px 0 0;
      font-size: 26px;
      line-height: 1.25;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .chart-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .chart-lead {
      margin: 6px 0 18px;
      font-size: 12.5px;
      color: var(--text-dim);
    }
    .closing {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--gap-grid);
    }
    .small .figure {
      font-size: 22px;
    }
    .mobile {
      display: flex;
      flex-direction: column;
      gap: var(--gap-grid);
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cut-chip {
      flex: none;
      border-radius: var(--radius-pill);
      background: var(--control-hover);
      color: var(--text-muted);
      font-size: 11.5px;
      font-weight: 600;
      padding: 7px 12px;
      white-space: nowrap;
    }
    .chart-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }
    .curve-summary {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }
    .curve-summary .right {
      text-align: right;
    }
    .curve-figure {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .curve-figure.accent {
      color: var(--accent-text);
    }
    .curve-caption {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--text-dim);
    }
    .comparison {
      margin-top: var(--gap-grid);
    }
    .risk {
      margin-top: var(--gap-grid);
    }
    .risk h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .risk ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .risk button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      width: 100%;
      border: none;
      border-radius: var(--radius-tile);
      background: var(--card-nested);
      padding: 14px 16px;
      text-align: left;
    }
    .risk button:hover {
      background: var(--control-active);
    }
    .risk-name {
      font-size: 14px;
      font-weight: 700;
    }
    .secondary {
      border: none;
      border-radius: var(--radius-pill);
      background: var(--control-hover);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 12px 22px;
    }
    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 767px) {
      h1 {
        font-size: 24px;
      }
      .closing {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DashboardPage {
  protected readonly evm = inject(ProjectEvmStore);
  protected readonly projects = inject(ProjectsStore);
  protected readonly labels = inject(IndicatorLabels);
  private readonly selection = inject(SelectedProjectStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly placeholders = [0, 1, 2];
  protected readonly costTone = costTone;
  protected readonly scheduleTone = scheduleTone;
  protected readonly money = formatMoneyRounded;

  protected readonly pickerOpen = signal(false);
  protected readonly measurementOpen = signal(false);

  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  protected readonly selectedId = this.selection.projectId;

  /** Fecha del último corte, que es a la que se refieren las cifras del panel. */
  protected readonly lastCutoffLabel = computed(() => {
    const last = this.evm.timeline().at(-1);
    if (last === undefined) {
      return null;
    }
    return formatDate(last.cutoffDate, this.preferences.preferences().dateFormat);
  });
  protected readonly projectName = computed(
    () => this.evm.summary()?.project.name ?? 'Panel del proyecto',
  );

  protected readonly plannedShare = computed(() => {
    const indicators = this.evm.indicators();
    const budget = this.evm.budgetAtCompletion();
    if (indicators === undefined || budget === 0) {
      return null;
    }
    const share = (indicators.plannedValue / budget) * PERCENT_BASE;
    return `${formatPercent(Math.round(share))} del ${this.labels.inline('BAC')}`;
  });

  protected readonly earnedShare = computed(() => {
    const indicators = this.evm.indicators();
    const budget = this.evm.budgetAtCompletion();
    if (indicators === undefined || budget === 0) {
      return null;
    }
    const share = (indicators.earnedValue / budget) * PERCENT_BASE;
    return `${formatPercent(Math.round(share * 10) / 10)} de avance físico`;
  });

  protected readonly costGap = computed(() => {
    const indicators = this.evm.indicators();
    if (indicators === undefined) {
      return null;
    }
    const gap = Math.abs(indicators.costVariance);
    const direction = indicators.costVariance < 0 ? 'por encima del' : 'por debajo del';
    return `${formatMoneyRounded(gap)} ${direction} ${this.labels.inline('EV')}`;
  });

  protected readonly timelineLead = computed(() => {
    const total = this.evm.timeline().length;
    if (total === 0) {
      return 'Sin cortes registrados.';
    }
    return total === 1 ? '1 corte registrado.' : `${total} cortes registrados.`;
  });

  protected readonly warningLabel = computed(() =>
    this.preferences.preferences().warningThreshold.toFixed(2).replace('.', ','),
  );
  protected readonly criticalLabel = computed(() =>
    this.preferences.preferences().criticalThreshold.toFixed(2).replace('.', ','),
  );

  constructor() {
    effect(() => {
      // Si no había selección guardada, o el proyecto guardado ya no existe, se toma el primero.
      this.selection.ensureSelection(this.projects.projects());
      this.evm.select(this.selection.projectId());
    });
  }

  protected choose(projectId: number): void {
    this.selection.select(projectId);
    this.pickerOpen.set(false);
  }

  protected goToActivities(): void {
    const projectId = this.selectedId();
    if (projectId !== undefined) {
      void this.router.navigate(['/proyectos', projectId, 'actividades']);
    }
  }

  protected goToActivity(activityId: number): void {
    const projectId = this.selectedId();
    if (projectId !== undefined) {
      void this.router.navigate(['/proyectos', projectId, 'actividades', activityId]);
    }
  }

  protected closeMeasurement(): void {
    this.measurementOpen.set(false);
    this.evm.clearError();
  }

  protected async registerMeasurement(request: MeasurementRequest): Promise<void> {
    const projectId = this.selectedId();
    if (projectId === undefined) {
      return;
    }
    if (await this.evm.createMeasurement(projectId, request)) {
      this.measurementOpen.set(false);
      this.toasts.success('Corte registrado', 'La curva S incorpora el nuevo punto.');
    }
  }
}
