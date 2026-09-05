import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Project } from '../../core/api/models/project';

/** Selector del proyecto activo, en forma de lista de opciones dentro de un diálogo. */
@Component({
  selector: 'app-project-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="options" role="radiogroup" aria-label="Proyecto activo">
      @for (project of projects(); track project.id) {
        <li>
          <button
            type="button"
            role="radio"
            [class.selected]="project.id === selectedId()"
            [attr.aria-checked]="project.id === selectedId()"
            (click)="choose.emit(project.id)"
          >
            <span class="radio" aria-hidden="true"></span>
            <span class="text">
              <span class="name">{{ project.name }}</span>
              <span class="meta">{{ project.description ?? 'Sin descripción' }}</span>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    .options {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    button {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 18px;
      background: var(--card-nested);
      padding: 14px 16px;
      text-align: left;
      transition: background var(--motion-veil);
    }
    button:hover {
      background: var(--control-active);
    }
    button.selected {
      background: rgba(139, 111, 224, 0.1);
      border-color: rgba(139, 111, 224, 0.45);
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
  `,
})
export class ProjectPicker {
  readonly projects = input.required<readonly Project[]>();
  readonly selectedId = input<number | undefined>(undefined);
  readonly choose = output<number>();
}
