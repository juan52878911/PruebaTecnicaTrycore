import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Project } from '../../core/api/models/project';
import { UndefinedIndicator } from '../../core/api/models/evm';
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
 * Selector del proyecto activo, anclado bajo su píldora.
 *
 * Es un desplegable y no un diálogo centrado a propósito: cambiar de proyecto es una acción de
 * navegación, no una decisión que merezca oscurecer la pantalla. Cada opción lleva su eficiencia
 * en costo y en plazo, que es lo que permite elegir sin entrar a mirar.
 */
@Component({
  selector: 'app-project-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IndexValue],
  host: {
    '(document:keydown.escape)': 'dismissed.emit()',
  },
  template: `
    <div class="veil" (click)="dismissed.emit()" aria-hidden="true"></div>
    <ul class="menu" role="listbox" aria-label="Proyecto activo">
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
      animation: valora-pop 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
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
  readonly options = input.required<readonly PickerOption[]>();
  readonly selectedId = input<number | undefined>(undefined);
  readonly choose = output<number>();
  readonly dismissed = output<void>();
}
