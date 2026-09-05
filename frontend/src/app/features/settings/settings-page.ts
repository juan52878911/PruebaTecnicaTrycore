import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PreferencesStore } from '../../core/preferences/preferences-store';
import {
  CurrencyCode,
  DateFormat,
  EacFormula,
  IndicatorNaming,
} from '../../core/preferences/preferences.model';
import { ChipGroup, ChipOption } from '../../shared/ui/chip-group';
import { formatIndex } from '../../core/format/evm-format';
import { SelectedProjectStore } from '../../core/selection/selected-project-store';
import { ProjectEvmStore } from '../evm/project-evm-store';
import { PageHeader } from '../../shared/ui/page-header';
import { FormField } from '../../shared/ui/form-field';
import { ToastService } from '../../shared/ui/toast.service';
import { ToggleSwitch } from '../../shared/ui/toggle-switch';

/**
 * Ajustes de la aplicación.
 *
 * Todo lo que aparece aquí como control es una preferencia real: cambia al instante y se conserva
 * entre sesiones en el almacenamiento del navegador, porque el backend no guarda configuración.
 *
 * Lo que el servidor decide se muestra como valor fijo con su fórmula, no como control apagado:
 * un interruptor que no cambia nada es peor que no ponerlo.
 */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectEvmStore],
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  imports: [ChipGroup, FormField, FormsModule, PageHeader, ToggleSwitch],
  template: `
    <app-page-header
      title="Ajustes"
      subtitle="del cálculo"
      lead="Estas preferencias se guardan en este navegador. No viajan al servidor ni afectan a los datos del proyecto."
    >
      <button type="button" class="chip" (click)="restore()">Restablecer valores</button>
    </app-page-header>

    <div class="layout">
      <nav class="side" aria-label="Secciones de ajustes">
        <ul>
          <li><a href="#presentacion" class="active">Presentación</a></li>
          <li><a href="#umbrales">Umbrales</a></li>
          <li><a href="#formato">Formato</a></li>
          <li><a href="#cierre">Costo al cierre</a></li>
          <li><a href="#servidor">Cálculo del servidor</a></li>
        </ul>
      </nav>

      <div class="panels">
        <section class="card" id="presentacion">
          <h2>Nombres de los indicadores</h2>
          <p class="hint">Cómo se rotulan en tablas, tarjetas y formularios.</p>
          <app-chip-group
            label="Nombres de los indicadores"
            [options]="namingOptions"
            [selected]="naming()"
            (selectedChange)="setNaming($event)"
          />
          <p class="note">
            <span class="dot"></span>
            {{ namingNote() }}
          </p>
        </section>

        <section class="card">
          <h2>Comportamiento</h2>
          <div class="switch-row">
            <div>
              <p class="switch-title">Mostrar interpretación en texto</p>
              <p class="hint">El motivo que redacta el servidor, junto a cada índice.</p>
            </div>
            <app-toggle-switch
              label="Mostrar interpretación en texto"
              [checked]="showInterpretation()"
              (checkedChange)="preferences.update({ showInterpretation: $event })"
            />
          </div>
          <div class="switch-row">
            <div>
              <p class="switch-title">Recalcular al guardar</p>
              <p class="hint">
                Tras registrar avance o costo, vuelve a pedir el consolidado al servidor.
              </p>
            </div>
            <app-toggle-switch
              label="Recalcular al guardar"
              [checked]="autoRefresh()"
              (checkedChange)="preferences.update({ autoRefreshAfterSave: $event })"
            />
          </div>
        </section>

        <section class="card" id="umbrales">
          <h2>Umbrales de tolerancia</h2>
          <p class="hint">
            No son un ajuste del navegador: los fija el servidor y viajan en cada respuesta, junto
            con la severidad ya clasificada. Repetirlos aquí abriría la puerta a que el color de una
            tarjeta dijera una cosa y su texto otra.
          </p>
          @if (thresholds(); as limits) {
            <dl class="fixed-list">
              <div>
                <dt>Sin desviación relevante</dt>
                <dd>índice ≥ {{ index(limits.warning) }}</dd>
              </div>
              <div>
                <dt>Desviación admitida</dt>
                <dd>{{ index(limits.critical) }} ≤ índice &lt; {{ index(limits.warning) }}</dd>
              </div>
              <div>
                <dt>Desviación crítica</dt>
                <dd>índice &lt; {{ index(limits.critical) }}</dd>
              </div>
            </dl>
          } @else {
            <p class="hint">Se leen del proyecto activo. Abre el panel para consultarlos.</p>
          }
        </section>

        <section class="card" id="formato">
          <h2>Formato</h2>
          <p class="hint">Cómo se rotulan las cifras y las fechas.</p>
          <div class="group">
            <span class="group-label">Moneda</span>
            <app-chip-group
              label="Moneda"
              [options]="currencyOptions"
              [selected]="currency()"
              (selectedChange)="setCurrency($event)"
            />
            <p class="note">
              <span class="dot"></span>
              Es solo el rótulo. El servidor guarda importes sin divisa, así que cambiarlo no
              convierte ninguna cifra.
            </p>
          </div>
          <div class="group">
            <span class="group-label">Formato de fecha</span>
            <app-chip-group
              label="Formato de fecha"
              [options]="dateFormatOptions"
              [selected]="dateFormat()"
              (selectedChange)="setDateFormat($event)"
            />
          </div>
        </section>

        <section class="card" id="cierre">
          <h2>Costo al cierre</h2>
          <p class="hint">
            Las tres fórmulas estándar se calculan siempre sobre las mismas cifras; aquí se elige
            cuál va en primer plano. El cálculo lo hace el servidor: la elección viaja con la
            petición, no se reproduce en el navegador.
          </p>
          <div class="radios" role="radiogroup" aria-label="Fórmula del costo al cierre">
            @for (option of eacOptions; track option.value) {
              <button
                type="button"
                role="radio"
                class="radio-card"
                [class.selected]="option.value === eacFormula()"
                [attr.aria-checked]="option.value === eacFormula()"
                (click)="setEacFormula(option.value)"
              >
                <span class="radio" aria-hidden="true"></span>
                <span class="radio-text">
                  <span class="radio-title">{{ option.label }}</span>
                  <span class="radio-note">{{ option.assumption }}</span>
                </span>
              </button>
            }
          </div>
        </section>

        <section class="card fixed" id="servidor">
          <h2>Cálculo del servidor</h2>
          <p class="hint">
            No son ajustes: son las reglas con las que el backend calcula los indicadores. Se
            muestran aquí para que quede claro de dónde salen las cifras.
          </p>
          <dl>
            <div>
              <dt>Medición del avance</dt>
              <dd>Se elige por actividad, en su formulario</dd>
            </div>
            <div>
              <dt>Redondeo</dt>
              <dd>Dinero a 2 decimales, índices a 4, medio hacia arriba</dd>
            </div>
            <div>
              <dt>Índice sin divisor</dt>
              <dd>Se devuelve indefinido, nunca cero</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  `,
  styles: `
    .chip {
      border: 1px solid var(--border-control);
      border-radius: var(--radius-pill);
      background: var(--control);
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      padding: 11px 18px;
      white-space: nowrap;
    }
    .chip:hover {
      background: var(--control-hover);
      color: var(--text);
    }
    .layout {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 28px;
      align-items: start;
    }
    .side ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .side a {
      display: block;
      padding: 11px 14px;
      border-radius: var(--radius-input);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-muted);
      text-decoration: none;
    }
    .side a:hover,
    .side a.active {
      background: var(--card-nested);
      color: var(--text);
    }
    .panels {
      display: flex;
      flex-direction: column;
      gap: var(--gap-grid);
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border-card);
      border-radius: 20px;
      padding: 24px 26px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    .hint {
      margin: 0 0 18px;
      max-width: 620px;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--text-dim);
    }
    .note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 16px 0 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--text-muted);
    }
    .dot {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 6px;
      border-radius: 50%;
      background: var(--accent);
    }
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-card);
    }
    .switch-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .switch-title {
      margin: 0 0 4px;
      font-size: 13.5px;
      font-weight: 700;
    }
    .switch-row .hint {
      margin: 0;
    }
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .group {
      margin-bottom: 22px;
    }
    .group:last-child {
      margin-bottom: 0;
    }
    .group-label {
      display: block;
      margin-bottom: 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .radios {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .radio-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 14px;
      background: var(--card-nested);
      padding: 15px 18px;
      text-align: left;
      transition:
        background var(--motion-veil),
        border-color var(--motion-veil);
    }
    .radio-card:hover {
      background: var(--control-active);
    }
    .radio-card.selected {
      border-color: rgba(169, 139, 255, 0.35);
    }
    .radio {
      flex: none;
      width: 18px;
      height: 18px;
      margin-top: 2px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
    }
    .radio-card.selected .radio {
      border: 5px solid var(--accent-light);
      background: var(--screen);
    }
    .radio-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .radio-title {
      font-size: 13.5px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .radio-note {
      font-size: 12px;
      line-height: 1.5;
      color: var(--text-dim);
    }
    .fixed-list {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fixed-list > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--divider);
    }
    .fixed-list > div:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .fixed-list dt {
      font-size: 12.5px;
      color: var(--text-muted);
    }
    .fixed-list dd {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .fixed dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fixed dl > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--divider);
    }
    .fixed dl > div:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .fixed dt {
      font-size: 12.5px;
      color: var(--text-muted);
    }
    .fixed dd {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      text-align: right;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .side {
        display: none;
      }
      .pair {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly preferences = inject(PreferencesStore);
  /**
   * Store del proyecto activo, solo para leer los umbrales con los que el servidor clasificó su
   * última respuesta. Se provee a nivel de esta ruta: no se comparte con el panel.
   */
  protected readonly evm = inject(ProjectEvmStore);
  protected readonly index = formatIndex;

  private readonly selection = inject(SelectedProjectStore);

  constructor() {
    // Los umbrales llegan con el análisis del proyecto activo; sin seleccionarlo no habría nada
    // que leer y la tarjeta se quedaría en su mensaje de reserva.
    effect(() => this.evm.select(this.selection.projectId()));
  }
  private readonly toasts = inject(ToastService);

  protected readonly namingOptions: readonly ChipOption<IndicatorNaming>[] = [
    { value: 'siglas', label: 'Siglas · CPI, SPI' },
    { value: 'claro', label: 'Texto claro · Eficiencia en costo' },
  ];

  protected readonly currencyOptions: readonly ChipOption<CurrencyCode>[] = [
    { value: 'USD', label: 'USD — Dólar' },
    { value: 'COP', label: 'COP — Peso colombiano' },
    { value: 'EUR', label: 'EUR — Euro' },
  ];

  /** Las tres fórmulas del contrato, con el supuesto que hace válida cada una. */
  protected readonly eacOptions: readonly {
    value: EacFormula;
    label: string;
    assumption: string;
  }[] = [
    {
      value: 'BAC_OVER_CPI',
      label: 'EAC = BAC / CPI',
      assumption: 'El desempeño de costo observado se mantiene hasta el final.',
    },
    {
      value: 'AC_PLUS_REMAINING',
      label: 'EAC = AC + (BAC − EV)',
      assumption: 'La desviación fue puntual; lo que queda se ejecuta según lo presupuestado.',
    },
    {
      value: 'AC_PLUS_REMAINING_OVER_CPI_SPI',
      label: 'EAC = AC + (BAC − EV) / (CPI × SPI)',
      assumption: 'Hay que recuperar el atraso sin ampliar el plazo.',
    },
  ];

  protected readonly dateFormatOptions: readonly ChipOption<DateFormat>[] = [
    { value: 'DD MMM AAAA', label: '31 ago 2026' },
    { value: 'AAAA-MM-DD', label: '2026-08-31' },
  ];

  protected readonly naming = this.preferences.indicatorNaming;
  protected readonly showInterpretation = this.preferences.showInterpretation;
  protected readonly autoRefresh = this.preferences.autoRefreshAfterSave;
  protected readonly currency = this.preferences.currencyCode;
  protected readonly dateFormat = computed(() => this.preferences.preferences().dateFormat);
  protected readonly eacFormula = this.preferences.eacFormula;

  /**
   * Umbrales con los que el servidor clasificó la última respuesta consultada.
   *
   * Se leen del proyecto activo en lugar de guardarse: son política del backend y pueden cambiar
   * sin que el navegador se entere.
   */
  protected readonly thresholds = computed(() => this.evm.indicators()?.thresholds);

  protected readonly namingNote = computed(() =>
    this.naming() === 'siglas'
      ? 'Siglas del estándar PMI. Compactas, pero exigen conocer el vocabulario del Valor Ganado.'
      : 'Texto en español. Ocupa más, y quien no conoce el estándar entiende el tablero sin glosario.',
  );

  protected setNaming(value: IndicatorNaming): void {
    this.preferences.update({ indicatorNaming: value });
  }

  protected setCurrency(value: CurrencyCode): void {
    this.preferences.update({ currencyCode: value });
  }

  protected setDateFormat(value: DateFormat): void {
    this.preferences.update({ dateFormat: value });
  }

  protected setEacFormula(value: EacFormula): void {
    this.preferences.update({ eacFormula: value });
  }

  protected restore(): void {
    this.preferences.reset();
    this.toasts.info('Ajustes restablecidos', 'Se recuperaron los valores por defecto.');
  }
}
