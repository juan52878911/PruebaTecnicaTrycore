import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Interruptor de dos estados. Es un `button` real, no un `div`, para que responda al teclado. */
@Component({
  selector: 'app-toggle-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="track"
      [class.on]="checked()"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      (click)="checked.set(!checked())"
    >
      <span class="knob"></span>
    </button>
  `,
  styles: `
    .track {
      position: relative;
      width: 46px;
      height: 26px;
      border: none;
      border-radius: var(--radius-pill);
      background: #2a2a2e;
      padding: 0;
      transition: background 200ms ease;
    }
    .track.on {
      background: var(--accent-light);
    }
    .knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.5);
      transition:
        left 200ms ease,
        background 200ms ease;
    }
    .track.on .knob {
      left: 23px;
      background: var(--screen);
    }
  `,
})
export class ToggleSwitch {
  readonly checked = model.required<boolean>();
  readonly label = input.required<string>();
}
