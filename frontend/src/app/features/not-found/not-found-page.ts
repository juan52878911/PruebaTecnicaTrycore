import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Ruta desconocida. */
@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="card">
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna vista de Valora.</p>
      <a routerLink="/panel">Volver al panel</a>
    </section>
  `,
  styles: `
    .card {
      background: var(--card);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-card);
      padding: 56px 32px;
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    p {
      margin: 0 0 20px;
      font-size: 13px;
      color: var(--text-muted);
    }
    a {
      font-size: 13px;
      font-weight: 700;
    }
  `,
})
export class NotFoundPage {}
