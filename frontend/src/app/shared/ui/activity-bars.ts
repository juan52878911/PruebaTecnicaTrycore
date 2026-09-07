import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Activity } from '../../core/api/models/activity';
import { formatMoneyRounded } from '../../core/format/evm-format';
import { barHeight, sharedScale } from './bar-scale';

/**
 * Comparativa de PV, EV y AC actividad por actividad, en barras agrupadas.
 *
 * Es la gráfica que pide el enunciado: una columna por actividad con sus tres cifras en dinero,
 * para ver de un vistazo cuál gasta más de lo que gana y cuál va por detrás de lo previsto.
 *
 * Las tres series comparten una escala única, la del valor más alto de todo el proyecto. Se
 * dibujan todas las actividades: ocultar alguna sería mentir sobre el proyecto, así que con muchas
 * la gráfica se desplaza en horizontal en lugar de recortarse.
 */
@Component({
  selector: 'app-activity-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend">
      <span class="entry"><span class="chip pv"></span>{{ plannedLabel() }}</span>
      <span class="entry"><span class="chip ev"></span>{{ earnedLabel() }}</span>
      <span class="entry"><span class="chip ac"></span>{{ actualCostLabel() }}</span>
    </div>

    <div class="plot" role="img" [attr.aria-label]="accessibleSummary()">
      @for (group of groups(); track group.id) {
        <div class="group">
          <div class="bars">
            <span
              class="bar pv"
              [style.height.%]="group.plannedHeight"
              [attr.title]="group.plannedText"
            ></span>
            <span
              class="bar ev"
              [style.height.%]="group.earnedHeight"
              [attr.title]="group.earnedText"
            ></span>
            <span
              class="bar ac"
              [style.height.%]="group.costHeight"
              [attr.title]="group.costText"
            ></span>
          </div>
          <span class="tick" [attr.title]="group.name">{{ group.name }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .entry {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .chip {
      width: 10px;
      height: 10px;
      border-radius: 3px;
    }
    .chip.pv,
    .bar.pv {
      background: var(--pv);
    }
    .chip.ev,
    .bar.ev {
      background: var(--accent);
    }
    .chip.ac,
    .bar.ac {
      background: var(--ac);
    }
    .plot {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      height: 230px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .group {
      flex: 1;
      min-width: 88px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 100%;
      border-radius: 10px;
      padding: 4px;
      transition: background var(--motion-veil);
    }
    .group:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      width: 100%;
      min-height: 0;
    }
    .bar {
      flex: 1;
      border-radius: 8px 8px 3px 3px;
      min-height: 2px;
      transform-origin: bottom center;
      transition: height 400ms cubic-bezier(0.4, 0, 0.2, 1);
      animation: valora-grow 600ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    @keyframes valora-grow {
      from {
        transform: scaleY(0);
      }
      to {
        transform: scaleY(1);
      }
    }
    .tick {
      max-width: 100%;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
})
export class ActivityBars {
  readonly activities = input.required<readonly Activity[]>();
  readonly plannedLabel = input('PV');
  readonly earnedLabel = input('EV');
  readonly actualCostLabel = input('AC');

  private readonly scale = computed(() =>
    sharedScale(
      this.activities().flatMap((activity) => [
        activity.indicators.plannedValue,
        activity.indicators.earnedValue,
        activity.indicators.actualCost,
      ]),
    ),
  );

  protected readonly groups = computed(() => {
    const scale = this.scale();
    return this.activities().map((activity) => {
      const { plannedValue, earnedValue, actualCost } = activity.indicators;
      return {
        id: activity.id,
        name: activity.name,
        plannedHeight: barHeight(plannedValue, scale),
        earnedHeight: barHeight(earnedValue, scale),
        costHeight: barHeight(actualCost, scale),
        plannedText: `${this.plannedLabel()} ${formatMoneyRounded(plannedValue)}`,
        earnedText: `${this.earnedLabel()} ${formatMoneyRounded(earnedValue)}`,
        costText: `${this.actualCostLabel()} ${formatMoneyRounded(actualCost)}`,
      };
    });
  });

  protected readonly accessibleSummary = computed(() => {
    const groups = this.groups();
    if (groups.length === 0) {
      return 'Sin actividades que comparar';
    }
    return `Comparativa por actividad, ${groups.length} actividades. ${groups
      .map((group) => `${group.name}: ${group.plannedText}, ${group.earnedText}, ${group.costText}`)
      .join('. ')}.`;
  });
}
