import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de comportamiento contra el servidor de desarrollo.
 *
 * La API se simula desde el navegador (ver `e2e/fixtures/api.ts`), así que no hace falta el
 * backend: lo que se prueba es la interfaz, en escritorio a 1360 px y en un móvil de 375 px, que
 * son los dos artboards del diseño.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1360, height: 900 } },
    },
    {
      name: 'movil',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
