import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { Project } from '../../core/api/models/project';
import { UndefinedIndicator } from '../../core/api/models/evm';
import { BreakpointService } from '../../core/layout/breakpoint.service';
import { Tone } from '../../core/status/status-tone';
import { IndexValue } from '../../shared/ui/index-value';

/** Una opción del selector, con lo que hace falta para decidir sin salir del menú. */
export interface PickerOption {
  readonly project: Project;
  readonly meta: string;
  readonly costPerformanceIndex: UndefinedIndicator;
  readonly schedulePerformanceIndex: UndefinedIndicator;
  readonly costTone: Tone;
  readonly scheduleTone: Tone;
}

/**
 * Selector del proyecto activo: desplegable bajo su píldora en escritorio, hoja inferior en móvil.
 *
 * En escritorio es un desplegable y no un diálogo centrado a propósito: cambiar de proyecto es
 * una acción de navegación, no una decisión que merezca oscurecer la pantalla. En móvil no hay
 * sitio para anclarlo y el diseño lo resuelve como hoja inferior, igual que los formularios. Cada
 * opción lleva su eficiencia en costo y en plazo, que es lo que permite elegir sin entrar a mirar.
 */
@Component({
  selector: 'app-project-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IndexValue],
  host: {
    '(document:keydown.escape)': 'dismissed.emit()',
    '[class.sheet]': '!isDesktop()',
  },
  template: `
    <div class="veil" (click)="dismissed.emit()" aria-hidden="true"></div>
    <ul class="menu" role="listbox" aria-label="Proyecto activo">
      @if (!isDesktop()) {
        <li class="grabber" aria-hidden="true"></li>
      }
      @for (option of options(); track option.project.id) {
        <li>
          <button
            type="button"
            role="option"
            [class.selected]="option.project.id === selectedId()"
            [attr.aria-selected]="option.project.id === selectedId()"
            (click)="choose.emit(option.project.id)"
          >
            <span class="radio" aria-hidden="true"></span>
            <span class="text">
              <span class="name">{{ option.project.name }}</span>
              <span class="meta">{{ option.meta }}</span>
            </span>
            <span class="indices">
              <span class="badge" [class]="'tone-' + option.costTone">
                <app-index-value [value]="option.costPerformanceIndex" [tone]="option.costTone" />
              </span>
              <span class="badge" [class]="'tone-' + option.scheduleTone">
                <app-index-value
                  [value]="option.schedulePerformanceIndex"
                  [tone]="option.scheduleTone"
                />
              </span>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 20;
    }
    .veil {
      position: fixed;
      inset: 0;
      z-index: -1;
    }
    /* Hoja inferior: mismo plano que los diálogos, por encima de la barra de pestañas. */
    :host(.sheet) {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: flex-end;
    }
    :host(.sheet) .veil {
      z-index: auto;
      background: rgba(4, 4, 5, 0.72);
      backdrop-filter: blur(3px);
    }
    :host(.sheet) .menu {
      position: relative;
      width: 100%;
      max-width: none;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      border-radius: 28px 28px 0 0;
      padding: 10px 12px calc(16px + env(safe-area-inset-bottom, 0px));
      animation: vSheet 240ms cubic-bezier(0.2, 0.85, 0.3, 1);
    }
    .grabber {
      width: 38px;
      height: 4px;
      margin: 0 auto 12px;
      border-radius: var(--radius-pill);
      background: rgba(255, 255, 255, 0.18);
    }
    .menu {
      list-style: none;
      margin: 0;
      padding: 8px;
      width: 340px;
      max-width: calc(100vw - 32px);
      background: var(--card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      animation: vPop 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
    }
    button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      border: none;
      border-radius: 14px;
      background: none;
      padding: 13px 14px;
      text-align: left;
      transition: background var(--motion-veil);
    }
    button:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    button.selected {
      background: rgba(139, 111, 224, 0.1);
    }
    .radio {
      flex: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.25);
    }
    button.selected .radio {
      border: 5px solid var(--accent-light);
      background: var(--screen);
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .name {
      font-size: 13.5px;
      font-weight: 700;
    }
    .meta {
      font-size: 11px;
      color: var(--text-dim);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .indices {
      display: flex;
      gap: 6px;
      flex: none;
    }
    .badge {
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
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
  `,
})
export class ProjectPicker {
  protected readonly isDesktop = inject(BreakpointService).isDesktop;

  readonly options = input.required<readonly PickerOption[]>();
  readonly selectedId = input<number | undefined>(undefined);
  readonly choose = output<number>();
  readonly dismissed = output<void>();
}
