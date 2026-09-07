import { expect, test } from '@playwright/test';

import { mockApi } from './fixtures/api';

test.describe('escritorio', () => {
  test.skip(({ isMobile }) => isMobile, 'solo en el proyecto de escritorio');

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('el menú de Ajustes desplaza a la sección y resalta la que está en vista', async ({
    page,
  }) => {
    await page.goto('/ajustes');
    const menu = page.getByRole('navigation', { name: 'Secciones de ajustes' });

    await menu.getByRole('button', { name: 'Costo al cierre' }).click();
    await expect(page).toHaveURL(/\/ajustes$/);
    await expect(menu.getByRole('button', { name: 'Costo al cierre' })).toHaveClass(/active/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // Mientras el salto se asienta, el seguimiento del scroll cede; después vuelve a mandar.
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(menu.getByRole('button', { name: 'Presentación' })).toHaveClass(/active/);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(menu.getByRole('button', { name: 'Cálculo del servidor' })).toHaveClass(/active/);
  });

  test('las columnas del listado coinciden en todas las filas', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    await expect(page.locator('.row.clickable')).toHaveCount(5);
    const starts = await page.evaluate(() =>
      [...document.querySelectorAll('.row')].map((row) =>
        [...row.children]
          .filter((cell) => cell.tagName !== 'APP-ROW-TOOLS')
          .map((cell) => Math.round(cell.getBoundingClientRect().x)),
      ),
    );
    for (const row of starts) {
      expect(row).toEqual(starts[0]);
    }
  });

  test('las herramientas de fila solo aparecen al apuntarla y no reservan hueco', async ({
    page,
  }) => {
    await page.goto('/proyectos/1/actividades');
    const row = page.locator('.row.clickable').nth(1);
    const tools = row.locator('app-row-tools');
    const badge = row.locator('app-status-badge');

    await expect(tools).toHaveCSS('opacity', '0');
    await expect(tools).toHaveCSS('position', 'absolute');
    const badgeBefore = await badge.boundingBox();

    await row.hover();
    await expect(tools).toHaveCSS('opacity', '1');
    expect(await badge.boundingBox()).toEqual(badgeBefore);
    await expect(row.getByRole('button', { name: /^Editar / })).toBeVisible();
    await expect(row.getByRole('button', { name: /^Borrar / })).toBeVisible();
  });

  test('la fila entera abre el detalle de la actividad', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    await page.locator('.row.clickable').first().locator('span.tabular').first().click();
    await expect(page).toHaveURL(/\/proyectos\/1\/actividades\/\d+$/);
  });

  test('el botón de copiar no se mueve mientras la cifra rueda', async ({ page }) => {
    await page.goto('/panel');
    const card = page.locator('app-kpi-card').first();
    const button = card.getByRole('button', { name: /^Copiar / });
    const figure = card.locator('app-rolling-number');
    await expect(figure).toHaveText('1,24 M');
    // La vista entra con una animación corta; se mide cuando ya se ha asentado.
    await page.waitForTimeout(400);

    const center = async () => {
      const box = (await button.boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    const before = await center();
    await figure.hover();
    await expect(figure).toHaveText('1 240 000');
    await expect(button).toBeVisible();
    const after = await center();
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  });

  test('las barras por corte muestran su ficha al apuntar un corte', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    await page.locator('app-grouped-bars .group').last().hover();
    const tooltip = page.locator('app-grouped-bars .tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Corte · 31 ago');
    await expect(tooltip).toContainText('CPI 0,89');
    await expect(tooltip).toContainText('SPI 0,90');
  });

  test('el selector de la cabecera de Actividades cambia de proyecto sin pasar por el listado', async ({
    page,
  }) => {
    await page.goto('/proyectos/1/actividades');
    await page.getByRole('button', { name: 'Planta Solar Norte' }).click();
    await page.getByRole('option', { name: /Migración core bancario/ }).click();
    await expect(page).toHaveURL(/\/proyectos\/2\/actividades$/);
    await expect(page.locator('.row.clickable')).toHaveCount(2);
  });

  test('el corte de la cabecera es una etiqueta y no un botón', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    const tag = page.locator('app-page-header .tag');
    await expect(tag).toHaveText(/Corte: /);
    await expect(page.getByRole('button', { name: /^Corte: / })).toHaveCount(0);
  });
});
