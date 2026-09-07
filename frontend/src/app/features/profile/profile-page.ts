import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { BreakpointService } from '../../core/layout/breakpoint.service';
import { PageHeader } from '../../shared/ui/page-header';

import { MeasurementsApi } from '../../core/api/measurements-api';
import { PreferencesStore } from '../../core/preferences/preferences-store';
import { ProjectSummariesStore } from '../projects/project-summaries-store';

/**
 * Perfil del administrador.
 *
 * Los datos de identidad son fijos porque la aplicación no tiene inicio de sesión ni roles, tal
 * como declara el propio diseño. Lo que sí es real son los contadores de alcance, que salen de
 * los datos, y las preferencias, que reflejan lo que hay guardado en este navegador.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Entrada de vista del diseño: cada pantalla sube y aparece al montarse.
  host: { class: 'v-rise' },
  imports: [PageHeader, RouterLink],
  template: `
    <app-page-header title="Perfil" subtitle="del administrador" mobileKicker="Administrador" />

    <div class="grid">
      <div class="column">
        <section class="card identity" [class.row]="!isDesktop()">
          <span class="avatar" aria-hidden="true">AR</span>
          <div class="who">
            <h2>Alicia Ramos</h2>
            <p class="role">Administradora del sistema</p>
          </div>
        </section>

        <section class="card details">
          <dl>
            <div>
              <dt>Correo</dt>
              <dd>a.ramos&#64;valora.app</dd>
            </div>
            <div>
              <dt>Área</dt>
              <dd>{{ isDesktop() ? 'Dirección de Proyectos' : 'Dir. de Proyectos' }}</dd>
            </div>
            <div>
              <dt>Usuario</dt>
              <dd>admin</dd>
            </div>
            <div>
              <dt>Moneda</dt>
              <dd>{{ preferences.currencyCode() }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div class="column">
        <section class="card">
          <h2>Acceso</h2>
          <p class="note">
            <span class="dot"></span>
            La aplicación funciona con un único perfil de administrador. No hay inicio de sesión,
            registro ni roles: estos datos son fijos y solo se cambian en la configuración del
            despliegue.
          </p>
        </section>

        @if (isDesktop()) {
          <section class="card">
            <h2>Preferencias</h2>
            <div class="tiles">
              <div class="tile">
                <span class="label">Moneda</span>
                <p class="value">{{ preferences.currencyCode() }}</p>
              </div>
              <div class="tile">
                <span class="label">Formato de fecha</span>
                <p class="value">{{ dateFormat() }}</p>
              </div>
              <div class="tile">
                <span class="label">Indicadores</span>
                <p class="value">{{ namingLabel() }}</p>
              </div>
              <div class="tile">
                <span class="label">Interpretación</span>
                <p class="value">{{ preferences.showInterpretation() ? 'Visible' : 'Oculta' }}</p>
              </div>
            </div>
            <a class="link" routerLink="/ajustes">Cambiar en Ajustes</a>
          </section>
        }

        <section class="card">
          <h2>Alcance</h2>
          <div class="scope">
            <div>
              <span class="label">Proyectos</span>
              <p class="figure">{{ projectCount() }}</p>
            </div>
            <div>
              <span class="label">Actividades</span>
              <p class="figure">{{ activityCount() }}</p>
            </div>
            <div>
              <span class="label">Cortes registrados</span>
              <p class="figure">{{ measurementCount() }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
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
    .identity.row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .identity.row .avatar {
      width: 60px;
      height: 60px;
      font-size: 21px;
    }
    .identity.row h2 {
      margin: 0;
      font-size: 19px;
    }
    .identity.row .role {
      margin: 4px 0 0;
    }
    .details {
      padding: 6px var(--pad-card) 8px;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: var(--avatar);
      color: #c9aeff;
      font-size: 26px;
      font-weight: 700;
    }
    .identity h2 {
      margin: 18px 0 4px;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .role {
      margin: 0 0 22px;
      font-size: 13px;
      color: var(--text-dim);
    }
    .card h2 {
      margin: 0 0 16px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-strong);
    }
    dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    dl > div {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--divider);
    }
    dl > div:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    dt {
      font-size: 12.5px;
      color: var(--text-muted);
    }
    dd {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
    }
    .note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text-muted);
    }
    .dot {
      flex: none;
      width: 7px;
      height: 7px;
      margin-top: 7px;
      border-radius: 50%;
      background: var(--accent);
    }
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .tile {
      background: var(--card-nested);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-dim);
    }
    .value {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 700;
    }
    .link {
      display: inline-block;
      margin-top: 18px;
      font-size: 13px;
      font-weight: 600;
    }
    .scope {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .figure {
      margin: 8px 0 0;
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .identity,
      .details {
        margin-bottom: 0;
      }
    }
    @media (max-width: 767px) {
      .tiles,
      .scope {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class ProfilePage {
  protected readonly preferences = inject(PreferencesStore);
  protected readonly isDesktop = inject(BreakpointService).isDesktop;
  private readonly projects = inject(ProjectSummariesStore);
  private readonly measurementsApi = inject(MeasurementsApi);

  private readonly measurements = signal(0);

  protected readonly projectCount = computed(() => this.projects.rows().length);
  protected readonly activityCount = this.projects.totalActivities;
  protected readonly measurementCount = this.measurements.asReadonly();

  protected readonly dateFormat = computed(() => this.preferences.preferences().dateFormat);
  protected readonly namingLabel = computed(() =>
    this.preferences.indicatorNaming() === 'siglas' ? 'Siglas' : 'Texto claro',
  );

  constructor() {
    effect(() => {
      const projects = this.projects.rows();
      void this.loadMeasurementCount(projects.map((row) => row.project.id));
    });
  }

  /**
   * Cuenta los cortes recorriendo los proyectos.
   *
   * Proyectos y actividades salen del listado consolidado; los cortes no, porque el API no expone
   * un conteo global. Aquí es asumible: el perfil se abre de vez en cuando y la cantidad de
   * proyectos es pequeña. Si creciera, lo correcto sería un endpoint de resumen en el backend.
   */
  private async loadMeasurementCount(projectIds: readonly number[]): Promise<void> {
    const lists = await Promise.all(
      projectIds.map((id) => this.measurementsApi.list(id).catch(() => null)),
    );
    this.measurements.set(lists.reduce((total, list) => total + (list?.length ?? 0), 0));
  }
}
