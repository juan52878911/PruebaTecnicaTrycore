import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PreferencesStore } from '../../core/preferences/preferences-store';
import {
  CurrencyCode,
  DateFormat,
  IndicatorNaming,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from '../../core/preferences/preferences.model';
import { ChipGroup, ChipOption } from '../../shared/ui/chip-group';
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
  imports: [ChipGroup, FormField, FormsModule, ToggleSwitch],
  template: `
    <header class="page-header">
      <div>
        <h1>Ajustes <span>del cálculo</span></h1>
        <p class="lead">
          Estas preferencias se guardan en este navegador. No viajan al servidor ni afectan a los
          datos del proyecto.
        </p>
      </div>
      <button type="button" class="chip" (click)="restore()">Restablecer valores</button>
    </header>

    <div class="layout">
      <nav class="side" aria-label="Secciones de ajustes">
        <ul>
          <li><a href="#presentacion" class="active">Presentación</a></li>
          <li><a href="#umbrales">Umbrales</a></li>
          <li><a href="#formato">Formato</a></li>
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
          <h2>Umbrales de resalte</h2>
          <p class="hint">
            Marcan qué actividades aparecen en riesgo en el panel. No cambian el estado que devuelve
            el servidor: eso lo decide el cálculo, no la presentación.
          </p>
          <div class="pair">
            <app-form-field
              label="En riesgo cuando el índice baja de"
              fieldId="warning-threshold"
              [error]="warningError()"
            >
              <input
                id="warning-threshold"
                type="number"
                [min]="thresholdMin"
                [max]="thresholdMax"
                step="0.01"
                [ngModel]="warningThreshold()"
                (ngModelChange)="setWarning($event)"
              />
            </app-form-field>
            <app-form-field
              label="Crítica cuando el índice baja de"
              fieldId="critical-threshold"
              [error]="criticalError()"
            >
              <input
                id="critical-threshold"
                type="number"
                [min]="thresholdMin"
                [max]="thresholdMax"
                step="0.01"
                [ngModel]="criticalThreshold()"
                (ngModelChange)="setCritical($event)"
              />
            </app-form-field>
          </div>
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

        <section class="card fixed" id="servidor">
          <h2>Cálculo del servidor</h2>
          <p class="hint">
            No son ajustes: son las reglas con las que el backend calcula los indicadores. Se
            muestran aquí para que quede claro de dónde salen las cifras.
          </p>
          <dl>
            <div>
              <dt>Medición del avance</dt>
              <dd>Porcentaje completado</dd>
            </div>
            <div>
              <dt>Estimación al cierre</dt>
              <dd>EAC = BAC / CPI</dd>
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
      font-size: 44px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: -0.035em;
    }
    h1 span {
      color: rgba(255, 255, 255, 0.32);
    }
    .lead {
      margin: 10px 0 0;
      max-width: 560px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-dim);
    }
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
    @media (max-width: 767px) {
      h1 {
        font-size: 24px;
      }
    }
  `,
})
export class SettingsPage {
  protected readonly preferences = inject(PreferencesStore);
  private readonly toasts = inject(ToastService);

  protected readonly thresholdMin = THRESHOLD_MIN;
  protected readonly thresholdMax = THRESHOLD_MAX;

  protected readonly namingOptions: readonly ChipOption<IndicatorNaming>[] = [
    { value: 'siglas', label: 'Siglas · CPI, SPI' },
    { value: 'claro', label: 'Texto claro · Eficiencia en costo' },
  ];

  protected readonly currencyOptions: readonly ChipOption<CurrencyCode>[] = [
    { value: 'USD', label: 'USD — Dólar' },
    { value: 'COP', label: 'COP — Peso colombiano' },
    { value: 'EUR', label: 'EUR — Euro' },
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
  protected readonly warningThreshold = computed(
    () => this.preferences.preferences().warningThreshold,
  );
  protected readonly criticalThreshold = computed(
    () => this.preferences.preferences().criticalThreshold,
  );

  protected readonly namingNote = computed(() =>
    this.naming() === 'siglas'
      ? 'Siglas del estándar PMI. Compactas, pero exigen conocer el vocabulario del Valor Ganado.'
      : 'Texto en español. Ocupa más, y quien no conoce el estándar entiende el tablero sin glosario.',
  );

  protected readonly warningError = computed(() => this.thresholdError(this.warningThreshold()));
  protected readonly criticalError = computed(() => {
    const invalid = this.thresholdError(this.criticalThreshold());
    if (invalid !== null) {
      return invalid;
    }
    // Un umbral crítico por encima del de aviso dejaría el nivel intermedio sin ningún caso.
    return this.criticalThreshold() > this.warningThreshold()
      ? 'Debe ser menor o igual que el umbral de riesgo'
      : null;
  });

  protected setNaming(value: IndicatorNaming): void {
    this.preferences.update({ indicatorNaming: value });
  }

  protected setCurrency(value: CurrencyCode): void {
    this.preferences.update({ currencyCode: value });
  }

  protected setDateFormat(value: DateFormat): void {
    this.preferences.update({ dateFormat: value });
  }

  protected setWarning(value: number): void {
    if (this.thresholdError(value) === null) {
      this.preferences.update({ warningThreshold: Number(value) });
    }
  }

  protected setCritical(value: number): void {
    if (this.thresholdError(value) === null) {
      this.preferences.update({ criticalThreshold: Number(value) });
    }
  }

  protected restore(): void {
    this.preferences.reset();
    this.toasts.info('Ajustes restablecidos', 'Se recuperaron los valores por defecto.');
  }

  private thresholdError(value: number): string | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < THRESHOLD_MIN || parsed > THRESHOLD_MAX) {
      return `Debe estar entre ${THRESHOLD_MIN} y ${THRESHOLD_MAX}`;
    }
    return null;
  }
}
