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
import { ViewTransition } from '../../core/layout/view-transition';
import {
  formatCompact,
  formatDate,
  formatIndex,
  formatMoneyRounded,
  formatPercent,
  formatShortDate,
} from '../../core/format/evm-format';
import { IndicatorLabels } from '../../core/labels/indicator-labels';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import { costTone, scheduleTone } from '../../core/status/status-tone';
import { EmptyState } from '../../shared/ui/empty-state';
import { IndexCard } from '../../shared/ui/index-card';
import { KpiCard } from '../../shared/ui/kpi-card';
import { ChipButton } from '../../shared/ui/chip-button';
import { KpiSkeleton } from '../../shared/ui/kpi-skeleton';
import { PageHeader } from '../../shared/ui/page-header';
import { OverallStatus } from '../../shared/ui/overall-status';
import { SCurve } from '../../shared/ui/s-curve';
import { ToastService } from '../../shared/ui/toast.service';
import { MeasurementDialog } from '../evm/measurement-dialog';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { PickerOption, ProjectPicker } from '../evm/project-picker';
import { ProjectSummariesStore } from '../projects/project-summaries-store';

const PERCENT_BASE = 100;

/** Panel del proyecto: cifras, índices, curva S y actividades en riesgo. */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  providers: [ProjectEvmStore],
  imports: [
    ChipButton,
    EmptyState,
    IndexCard,
    KpiCard,
    KpiSkeleton,
    MeasurementDialog,
    OverallStatus,
    PageHeader,
    ProjectPicker,
    SCurve,
  ],
  template: `
    <app-page-header
      title="Hola de nuevo"
      subtitle="Alicia"
      lead="Análisis de Valor Ganado a la fecha del último corte."
    >
      <div class="anchor">
        <app-chip-button
          [label]="projectName()"
          [open]="pickerOpen()"
          (pressed)="pickerOpen.set(!pickerOpen())"
        />
        @if (pickerOpen()) {
          <app-project-picker
            [options]="pickerOptions()"
            [selectedId]="selectedId()"
            (choose)="choose($event)"
            (dismissed)="pickerOpen.set(false)"
          />
        }
      </div>
      @if (selectedId()) {
        <app-chip-button
          [label]="lastCutoffShort() ? 'Corte: ' + lastCutoffShort() : 'Registrar corte'"
          [expandable]="!!lastCutoffShort()"
          (pressed)="measurementOpen.set(true)"
        />
      }
    </app-page-header>

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
    } @else if (showSkeleton()) {
      <!-- El esqueleto reproduce la misma retícula y la forma de cada tarjeta, para que el
           contenido no salte al llegar. -->
      <div class="grid">
        <div class="column">
          <app-kpi-skeleton shape="kpi" />
          <app-kpi-skeleton shape="kpi" />
          <app-kpi-skeleton shape="kpi" />
        </div>
        <div class="column">
          <app-kpi-skeleton shape="index" />
          <app-kpi-skeleton shape="index" />
          <app-kpi-skeleton shape="kpi" />
        </div>
        <div class="column wide">
          <app-kpi-skeleton shape="chart" />
          <div class="closing">
            <app-kpi-skeleton shape="kpi" />
            <app-kpi-skeleton shape="kpi" />
            <app-kpi-skeleton shape="kpi" />
          </div>
        </div>
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
              [tone]="costTone(indicators)"
            />
            <app-index-card
              [title]="labels.short('SPI')"
              [value]="indicators.schedulePerformanceIndex"
              [message]="indicators.scheduleStatus.message"
              [tone]="scheduleTone(indicators)"
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
              compact
              [footnote]="plannedShare()"
            />
            <app-kpi-card
              [title]="labels.title('EV')"
              [acronym]="labels.showAcronymBadge() ? 'EV' : null"
              [value]="indicators.earnedValue"
              unit="USD"
              compact
              [footnote]="earnedShare()"
            />
            <app-kpi-card
              [title]="labels.title('AC')"
              [acronym]="labels.showAcronymBadge() ? 'AC' : null"
              [value]="indicators.actualCost"
              unit="USD"
              compact
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
              [tone]="costTone(indicators)"
            />
            <app-index-card
              [title]="labels.title('SPI')"
              [acronym]="labels.showAcronymBadge() ? 'SPI' : null"
              [value]="indicators.schedulePerformanceIndex"
              [message]="indicators.scheduleStatus.message"
              [tone]="scheduleTone(indicators)"
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
              <h2 class="chart-title">Curva S del proyecto</h2>
              @if (evm.hasTimeline()) {
                <app-s-curve
                  [points]="evm.timeline()"
                  [plannedLabel]="labels.short('PV')"
                  [earnedLabel]="labels.short('EV')"
                  [actualCostLabel]="labels.short('AC')"
                  [costLabel]="labels.short('CPI')"
                  [scheduleLabel]="labels.short('SPI')"
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
                <p class="figure">{{ compact(indicators.estimateAtCompletion) }}</p>
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
                <p class="figure">{{ compact(evm.budgetAtCompletion()) }}</p>
              </div>
            </div>
          </div>
        </div>
      }
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
    .anchor {
      position: relative;
    }
    h1 {
      margin: 0;
      font-size: 54px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.04em;
    }
    h1 span {
      color: rgba(255, 255, 255, 0.32);
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
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .chip svg {
      width: 16px;
      height: 16px;
      fill: var(--text-dim);
    }
    .chip:hover {
      background: var(--control-hover);
      color: var(--text);
    }
    .chart-title {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
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
    /*
     * Entrada escalonada, columna a columna. El retraso es corto a propósito: marca el orden de
     * lectura sin hacer esperar a quien ya sabe lo que viene a mirar.
     */
    .grid > .column {
      animation: valora-rise 320ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
    }
    .grid > .column:nth-child(2) {
      animation-delay: 60ms;
    }
    .grid > .column:nth-child(3) {
      animation-delay: 120ms;
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
  protected readonly projects = inject(ProjectSummariesStore);
  protected readonly labels = inject(IndicatorLabels);
  private readonly selection = inject(SelectedProjectStore);
  private readonly preferences = inject(PreferencesStore);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly placeholders = [0, 1, 2];
  protected readonly costTone = costTone;
  protected readonly scheduleTone = scheduleTone;
  protected readonly money = formatMoneyRounded;
  protected readonly compact = formatCompact;

  protected readonly pickerOpen = signal(false);
  protected readonly measurementOpen = signal(false);

  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  private readonly transition = inject(ViewTransition);

  /**
   * El esqueleto cubre dos casos: los datos que aún no han llegado y la transición entre vistas.
   * Sin el segundo, cambiar de pestaña con los datos ya en caché no da ningún acuse de recibo.
   */
  protected readonly showSkeleton = computed(
    () => this.transition.isTransitioning() || (this.evm.isLoading() && !this.evm.summary()),
  );
  protected readonly selectedId = this.selection.projectId;

  /** Fecha abreviada del último corte, para el distintivo de la cabecera. */
  protected readonly lastCutoffShort = computed(() => {
    const last = this.evm.timeline().at(-1);
    return last === undefined ? null : formatShortDate(last.cutoffDate);
  });

  /** Fecha del último corte, que es a la que se refieren las cifras del panel. */
  protected readonly lastCutoffLabel = computed(() => {
    const last = this.evm.timeline().at(-1);
    if (last === undefined) {
      return null;
    }
    return formatDate(last.cutoffDate, this.preferences.preferences().dateFormat);
  });
  protected readonly projectName = computed(
    () => this.evm.summary()?.project.name ?? 'Elegir proyecto',
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

  /** Umbrales con los que el servidor clasificó estas cifras; no se reproducen en el cliente. */
  protected readonly warningLabel = computed(() =>
    formatIndex(this.evm.indicators()?.thresholds.warning ?? null),
  );
  protected readonly criticalLabel = computed(() =>
    formatIndex(this.evm.indicators()?.thresholds.critical ?? null),
  );

  constructor() {
    effect(() => {
      // Si no había selección guardada, o el proyecto guardado ya no existe, se toma el primero.
      this.selection.ensureSelection(this.projects.rows().map((row) => row.project));
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
