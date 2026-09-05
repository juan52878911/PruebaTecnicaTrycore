import { expect, Locator, test } from '@playwright/test';

import { mockApi, ROUTES } from './fixtures/api';

/** Caja del elemento una vez terminada su animación de entrada: dos lecturas seguidas iguales. */
async function settledBox(locator: Locator) {
  let previous = JSON.stringify(await locator.boundingBox());
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await locator.page().waitForTimeout(60);
    const current = JSON.stringify(await locator.boundingBox());
    if (current === previous) {
      return JSON.parse(current) as { x: number; y: number; width: number; height: number };
    }
    previous = current;
  }
  throw new Error('El elemento no dejó de moverse');
}

test.describe('móvil', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo en el proyecto móvil');

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test('ninguna vista desborda en horizontal', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).not.toBeEmpty();
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(overflow.document, route).toBeLessThanOrEqual(overflow.viewport);
    }
  });

  test('la barra inferior queda fija a la ventana y no tapa el último contenido', async ({
    page,
  }) => {
    await page.goto('/proyectos/1/actividades');
    const nav = page.locator('app-mobile-tab-bar nav');
    await expect(nav).toBeVisible();

    const viewport = page.viewportSize();
    const before = await settledBox(nav);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const after = await nav.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    expect(after!.y + after!.height).toBeLessThanOrEqual(viewport!.height);

    // El último elemento del documento termina por encima de la barra.
    const lastBottom = await page.evaluate(() => {
      const items = [...document.querySelectorAll('main *')].filter(
        (element) => element.getBoundingClientRect().height > 0,
      );
      return Math.max(...items.map((element) => element.getBoundingClientRect().bottom));
    });
    expect(lastBottom).toBeLessThanOrEqual(after!.y);
  });

  test('la hoja de nueva actividad ocupa el ancho y pasa por encima de la barra', async ({
    page,
  }) => {
    await page.goto('/proyectos/1/actividades');
    await page.getByRole('button', { name: '+ Nueva' }).click();
    const sheet = page.getByRole('dialog', { name: 'Nueva actividad' });
    await expect(sheet).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await settledBox(sheet);
    expect(box.x).toBe(0);
    expect(box.width).toBe(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // Terminada la animación de entrada de la vista, la hoja está delante de la barra.
    const nav = (await page.locator('app-mobile-tab-bar nav').boundingBox())!;
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('app-dialog') !== null,
      [nav.x + nav.width / 2, nav.y + nav.height / 2],
    );
    expect(onTop).toBe(true);
  });

  test('la hoja de registrar corte pasa por encima de la barra', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('button', { name: /Corte:|Registrar corte/ }).click();
    await expect(page.getByRole('dialog', { name: 'Registrar corte' })).toBeVisible();
    await page.waitForTimeout(400);
    const nav = (await page.locator('app-mobile-tab-bar nav').boundingBox())!;
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('app-dialog') !== null,
      [nav.x + nav.width / 2, nav.y + nav.height / 2],
    );
    expect(onTop).toBe(true);
  });

  test('el selector de proyecto se abre como hoja inferior', async ({ page }) => {
    await page.goto('/panel');
    await page.getByRole('button', { name: 'Planta Solar Norte' }).click();
    const list = page.getByRole('listbox', { name: 'Proyecto activo' });
    await expect(list).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await settledBox(list);
    expect(box.x).toBe(0);
    expect(box.width).toBe(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

    await page.getByRole('option', { name: /Migración core bancario/ }).click();
    await expect(page.getByRole('button', { name: 'Migración core bancario' })).toBeVisible();
  });

  test('la comparativa por corte cabe en el ancho de la pantalla', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    await expect(page.locator('app-grouped-bars .group')).toHaveCount(3);
    const plot = (await page.locator('app-grouped-bars .plot').boundingBox())!;
    expect(plot.x + plot.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});
