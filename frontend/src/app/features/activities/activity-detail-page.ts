import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Activity, ActivityRequest } from '../../core/api/models/activity';
import {
  formatDateRange,
  formatIndex,
  formatIndexPrecise,
  formatMoneyRounded,
  formatPercent,
} from '../../core/format/evm-format';
import {
  IndicatorKey,
  IndicatorLabels,
  INDICATOR_FORMULAS,
} from '../../core/labels/indicator-labels';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { combinedStatusLabel, overallTone } from '../../core/status/status-tone';
import { EmptyState } from '../../shared/ui/empty-state';
import { MetricBar, MetricBars } from '../../shared/ui/metric-bars';
import { Skeleton } from '../../shared/ui/skeleton';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast.service';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { ProgressDialog } from './progress-dialog';

/** Detalle de una actividad: datos registrados, indicadores con su fórmula e interpretación. */
@Component({
  selector: 'app-activity-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  providers: [ProjectEvmStore],
  imports: [EmptyState, MetricBars, PageHeader, ProgressDialog, RouterLink, Skeleton, StatusBadge],
  template: `
    @if (isDesktop()) {
      <p class="breadcrumb">
        <a [routerLink]="['/proyectos', projectId(), 'actividades']">Actividades</a>
        · {{ projectName() }}
      </p>
      <app-page-header [title]="activity()?.name ?? 'Actividad'" [lead]="dateRange()">
        @if (activity(); as current) {
          <app-status-badge
            [label]="combinedStatusLabel(current.indicators)"
            [tone]="overallTone(current.indicators)"
          />
          <button type="button" class="primary" (click)="progressOpen.set(true)">
            Registrar avance
          </button>
        }
      </app-page-header>
    } @else if (activity(); as current) {
      <!-- En móvil la cabecera es una barra de acción: volver, estado y la acción principal. -->
      <div class="mobile-bar">
        <a
          class="back"
          [routerLink]="['/proyectos', projectId(), 'actividades']"
          aria-label="Volver a actividades"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </a>
        <app-status-badge
          [label]="combinedStatusLabel(current.indicators)"
          [tone]="overallTone(current.indicators)"
        />
        <button type="button" class="primary compact" (click)="progressOpen.set(true)">
          Registrar avance
        </button>
      </div>
      <h1 class="mobile-title">{{ current.name }}</h1>
      @if (dateRange(); as range) {
        <p class="mobile-dates">{{ range }}</p>
      }
    }

    @if (evm.error(); as error) {
      <p class="banner" role="alert">{{ error.detail }}</p>
    }

    @if (evm.isLoading() && !activity()) {
      <div class="card"><app-skeleton width="60%" [height]="24" /></div>
    } @else if (!activity()) {
      <app-empty-state
        title="Actividad no encontrada"
        description="La actividad ya no existe o pertenece a otro proyecto. Vuelve al listado para elegir otra."
      />
    } @else if (activity(); as current) {
      @if (!isDesktop()) {
        <div class="mini-grid">
          <div class="mini">
            <span class="mini-label">{{ labels.short('CPI') }}</span>
            <p class="mini-value">{{ index(current.indicators.costPerformanceIndex) }}</p>
          </div>
          <div class="mini">
            <span class="mini-label">{{ labels.short('SPI') }}</span>
            <p class="mini-value">{{ index(current.indicators.schedulePerformanceIndex) }}</p>
          </div>
          <div class="mini">
            <span class="mini-label">{{ labels.short('EAC') }}</span>
            <p class="mini-value">{{ money(current.indicators.estimateAtCompletion) }}</p>
          </div>
        </div>
      }
      <div class="grid">
        <section class="card">
          <h2>Datos registrados</h2>
          <dl class="records">
            <div>
              <dt>{{ labels.title('BAC') }}</dt>
              <dd>{{ money(current.budgetAtCompletion) }}</dd>
            </div>
            <div>
              <dt>% avance planificado</dt>
              <dd>{{ percent(current.plannedProgressPercent) }}</dd>
            </div>
            <div>
              <dt>% avance real</dt>
              <dd>{{ percent(current.actualProgressPercent) }}</dd>
            </div>
            <div>
              <dt>{{ labels.title('AC') }}</dt>
              <dd>{{ money(current.actualCost) }}</dd>
            </div>
          </dl>
          <!--
            Con las reglas de umbral lo reconocido no es lo declarado: sin este dato, un valor
            ganado de cero sobre un avance del 65 % parecería un error del sistema.
          -->
          <p class="rule">
            Regla de medición: {{ current.measurementMethodDescription }}.
            @if (recognisesLessThanDeclared(current)) {
              Reconoce {{ percent(current.effectivePlannedProgressPercent) }} del avance planificado
              y {{ percent(current.effectiveActualProgressPercent) }} del real.
            }
          </p>
        </section>

        <section class="card">
          <h2>{{ labels.short('PV') }} · {{ labels.short('EV') }} · {{ labels.short('AC') }}</h2>
          <app-metric-bars [bars]="bars()" [reference]="current.budgetAtCompletion" />
        </section>
      </div>

      <section class="card indicators">
        <h2>Indicadores calculados</h2>
        <div class="tiles">
          @for (tile of tiles(); track tile.key) {
            <div class="tile">
              <span class="formula">{{ tile.formula }}</span>
              <p [class]="'value tone-' + tile.tone">{{ tile.text }}</p>
            </div>
          }
        </div>
      </section>

      @if (showInterpretation()) {
        <section class="card interpretation">
          <h2>Interpretación</h2>
          <p>
            <span class="dot" [class]="'tone-' + overallTone(current.indicators)"></span>
            {{ current.indicators.costStatus.message }}
          </p>
          <p>
            <span class="dot" [class]="'tone-' + overallTone(current.indicators)"></span>
            {{ current.indicators.scheduleStatus.message }}
          </p>
        </section>
      }
    }

    @if (progressOpen() && activity(); as current) {
      <app-progress-dialog
        [activity]="current"
        [serverError]="evm.error()"
        (save)="persist($event)"
        (dismissed)="closeProgress()"
      />
    }
  `,
  styles: `
    .mobile-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .mobile-bar app-status-badge {
      min-width: 0;
      flex: 0 1 auto;
    }
    .back {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      flex: none;
      border: 1px solid var(--border-control);
      border-radius: 50%;
      background: var(--control);
    }
    .back svg {
      width: 20px;
      height: 20px;
      fill: rgba(255, 255, 255, 0.7);
    }
    .primary.compact {
      margin-left: auto;
      flex: none;
      font-size: 12px;
      padding: 9px 15px;
    }
    .mobile-title {
      margin: 0 0 4px;
      font-size: 24px;
      line-height: 1.15;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .mobile-dates {
      margin: 0 0 16px;
      font-size: 12.5px;
      color: var(--text-dim);
    }
    .mini-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .mini {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-tile);
      padding: 14px 15px;
    }
    .mini-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: var(--text-faint);
    }
    .mini-value {
      margin: 6px 0 0;
      font-size: 18px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .breadcrumb {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-dim);
    }
    .breadcrumb a {
      text-decoration: none;
    }
    .primary {
      border: none;
      border-radius: var(--radius-pill);
      background: #fff;
      color: var(--screen);
      font-size: 13px;
      font-weight: 700;
      padding: 12px 22px;
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
      grid-template-columns: 1fr 1fr;
      gap: var(--gap-grid);
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: var(--radius-card);
      padding: var(--pad-card);
    }
    h2 {
      margin: 0 0 18px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .rule {
      margin: 14px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--divider);
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-muted);
    }
    .records {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .records > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--divider);
    }
    .records > div:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    dt {
      font-size: 12.5px;
      color: var(--text-muted);
    }
    dd {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .indicators {
      margin-top: var(--gap-grid);
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }
    .tile {
      background: var(--card-nested);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .formula {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      font-variant-numeric: tabular-nums;
    }
    .value {
      margin: 10px 0 0;
      font-size: 20px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .interpretation {
      margin-top: var(--gap-grid);
    }
    .interpretation p {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 0 12px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-muted);
    }
    .interpretation p:last-child {
      margin-bottom: 0;
    }
    .dot {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 7px;
      border-radius: 50%;
      background: currentColor;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .tiles {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class ActivityDetailPage {
  protected readonly evm = inject(ProjectEvmStore);
  protected readonly labels = inject(IndicatorLabels);
  private readonly preferences = inject(PreferencesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  protected readonly money = formatMoneyRounded;
  protected readonly index = formatIndex;
  protected readonly percent = formatPercent;
  protected readonly combinedStatusLabel = combinedStatusLabel;
  protected readonly overallTone = overallTone;

  protected readonly progressOpen = signal(false);
  protected readonly showInterpretation = this.preferences.showInterpretation;

  protected readonly projectId = computed(() => this.paramAsId('projectId'));
  private readonly activityId = computed(() => this.paramAsId('activityId'));

  protected readonly activity = computed(() =>
    this.evm.activityList().find((candidate) => candidate.id === this.activityId()),
  );

  protected readonly projectName = computed(() => this.evm.summary()?.project.name ?? 'Proyecto');

  protected readonly dateRange = computed(() => {
    const current = this.activity();
    if (current === undefined) {
      return null;
    }
    return formatDateRange(
      current.plannedStartDate,
      current.plannedEndDate,
      this.preferences.preferences().dateFormat,
    );
  });

  protected readonly bars = computed<readonly MetricBar[]>(() => {
    const current = this.activity();
    if (current === undefined) {
      return [];
    }
    return [
      { label: this.labels.short('PV'), value: current.indicators.plannedValue, color: '#61616D' },
      { label: this.labels.short('EV'), value: current.indicators.earnedValue, color: '#8B6FE0' },
      { label: this.labels.short('AC'), value: current.indicators.actualCost, color: '#C4BC72' },
    ];
  });

  /** Los seis indicadores derivados, rotulados con su fórmula como en el diseño. */
  protected readonly tiles = computed(() => {
    const current = this.activity();
    if (current === undefined) {
      return [];
    }
    const indicators = current.indicators;
    const entries: readonly { key: IndicatorKey; value: number | null; negativeIsBad: boolean }[] =
      [
        { key: 'CV', value: indicators.costVariance, negativeIsBad: true },
        { key: 'SV', value: indicators.scheduleVariance, negativeIsBad: true },
        { key: 'CPI', value: indicators.costPerformanceIndex, negativeIsBad: false },
        { key: 'SPI', value: indicators.schedulePerformanceIndex, negativeIsBad: false },
        { key: 'EAC', value: indicators.estimateAtCompletion, negativeIsBad: false },
        { key: 'VAC', value: indicators.varianceAtCompletion, negativeIsBad: true },
      ];
    return entries.map((entry) => ({
      key: entry.key,
      formula: INDICATOR_FORMULAS[entry.key] ?? entry.key,
      text:
        entry.key === 'CPI' || entry.key === 'SPI'
          ? formatIndexPrecise(entry.value)
          : formatMoneyRounded(entry.value),
      tone: this.toneFor(entry.value, entry.negativeIsBad),
    }));
  });

  constructor() {
    effect(() => this.evm.select(this.projectId()));
  }

  protected closeProgress(): void {
    this.progressOpen.set(false);
    this.evm.clearError();
  }

  protected async persist(request: ActivityRequest): Promise<void> {
    const projectId = this.projectId();
    const activityId = this.activityId();
    if (projectId === undefined || activityId === undefined) {
      return;
    }
    const saved = await this.evm.updateActivity(projectId, activityId, request);
    if (saved === null) {
      return;
    }
    this.progressOpen.set(false);
    this.toasts.success(
      'Avance registrado',
      `${saved.name} al ${formatPercent(saved.actualProgressPercent)}. Indicadores recalculados por el servidor.`,
    );
  }

  protected recognisesLessThanDeclared(activity: Activity): boolean {
    return (
      activity.effectivePlannedProgressPercent !== activity.plannedProgressPercent ||
      activity.effectiveActualProgressPercent !== activity.actualProgressPercent
    );
  }

  private toneFor(value: number | null, negativeIsBad: boolean): string {
    if (value === null) {
      return 'neutral';
    }
    if (!negativeIsBad) {
      return 'neutral';
    }
    return value < 0 ? 'danger' : 'success';
  }

  private paramAsId(name: string): number | undefined {
    const parsed = Number(this.route.snapshot.paramMap.get(name));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }
}
