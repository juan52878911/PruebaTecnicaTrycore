import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bloque de carga con brillo, para ocupar el sitio de lo que aún no ha llegado. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="block"
    [style.width]="width()"
    [style.height.px]="height()"
    aria-hidden="true"
  ></span>`,
  styles: `
    .block {
      display: block;
      border-radius: 8px;
      background: linear-gradient(90deg, #17171a 0%, #212126 50%, #17171a 100%);
      background-size: 320px 100%;
      animation: valora-shimmer 1.15s linear infinite;
    }
  `,
})
export class Skeleton {
  readonly width = input('100%');
  readonly height = input(13);
}
