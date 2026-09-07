import { expect, Locator, Page, test } from '@playwright/test';

import { mockApi, ROUTES } from './fixtures/api';

/** En móvil el desplazamiento es del contenido, no del documento. */
async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const main = document.querySelector('main')!;
    main.scrollTop = main.scrollHeight;
  });
}

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

  test('ninguna vista desborda: el documento no se desplaza en ningún eje', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator('main')).not.toBeEmpty();
      const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      }));
      expect(overflow.document, route).toBeLessThanOrEqual(overflow.viewport);
      // Tampoco en vertical: el único scroll es el del contenido, nunca el del documento.
      expect(overflow.documentHeight, route).toBeLessThanOrEqual(overflow.viewportHeight);
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
    await scrollToBottom(page);
    const after = await nav.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    expect(after!.y + after!.height).toBeLessThanOrEqual(viewport!.height);

    // Al final del desplazamiento, el último contenido queda entero por encima de la barra.
    const scrolled = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      return main.scrollTop > 0 && main.scrollTop + main.clientHeight >= main.scrollHeight - 1;
    });
    expect(scrolled).toBe(true);
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
    // Con la vista ya cargada (si no, el "+" aún no sabe en qué proyecto está), el alta sale del
    // "+" de la barra inferior, como en el diseño.
    await expect(page.locator('app-activities-page .cards li')).toHaveCount(5);
    await page.getByRole('button', { name: 'Nueva actividad' }).click();
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
    await page.locator('.cut-chip').click();
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
    await page.getByRole('button', { name: 'Cambiar de proyecto' }).click();
    const list = page.getByRole('listbox', { name: 'Proyecto activo' });
    await expect(list).toBeVisible();

    const viewport = page.viewportSize()!;
    const box = await settledBox(list);
    expect(box.x).toBe(0);
    expect(box.width).toBe(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

    await page.getByRole('option', { name: /Migración core bancario/ }).click();
    await expect(page.getByRole('button', { name: 'Cambiar de proyecto' })).toHaveText(
      /Migración core bancario/,
    );
  });

  test('la cabecera sigue el artboard: rótulo, título y avatar, sin chips', async ({ page }) => {
    const expected: Record<string, [string, string]> = {
      '/panel': ['Proyecto', 'Planta Solar Norte'],
      '/proyectos': ['3 activos', 'Proyectos'],
      '/proyectos/1/actividades': ['Planta Solar Norte', 'Actividades'],
      '/proyectos/1/actividades/1': ['Planta Solar Norte', 'Obra civil — cimentación'],
      '/ajustes': ['Cálculo EVM', 'Ajustes'],
      '/perfil': ['Administrador', 'Perfil'],
    };
    for (const [route, [kicker, title]] of Object.entries(expected)) {
      await page.goto(route);
      const header = page.locator('app-page-header header');
      await expect(header.locator('.kicker'), route).toHaveText(kicker);
      await expect(header.locator('h1'), route).toHaveText(title);
      await expect(header.locator('.avatar'), route).toBeVisible();
      await expect(header.locator('app-chip-button:visible'), route).toHaveCount(0);
    }
    // Solo el panel y las actividades permiten cambiar de proyecto desde el título.
    await page.goto('/proyectos');
    await expect(page.getByRole('button', { name: 'Cambiar de proyecto' })).toHaveCount(0);
  });

  test('el botón de alta va dentro de la barra, entre Proyectos y Actividades', async ({
    page,
  }) => {
    await page.goto('/panel');
    const nav = page.locator('app-mobile-tab-bar nav');
    const bar = await settledBox(nav);
    const plus = (await page.getByRole('button', { name: 'Nueva actividad' }).boundingBox())!;
    expect(plus.y).toBeGreaterThanOrEqual(bar.y);
    expect(plus.y + plus.height).toBeLessThanOrEqual(bar.y + bar.height);
    const projects = (await nav.getByRole('link', { name: 'Proyectos' }).boundingBox())!;
    const activities = (await nav.getByRole('link', { name: 'Actividades' }).boundingBox())!;
    expect(plus.x).toBeGreaterThan(projects.x + projects.width - 1);
    expect(plus.x + plus.width).toBeLessThan(activities.x + 1);
  });

  test('la comparativa por corte es de escritorio: en móvil no se muestra', async ({ page }) => {
    await page.goto('/proyectos/1/actividades');
    await expect(page.locator('app-activities-page .cards li')).toHaveCount(5);
    await expect(page.locator('app-grouped-bars')).toHaveCount(0);
  });
});

test.describe('móvil · scroll con capas', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo en el proyecto móvil');

  test('con una hoja abierta solo se desplaza la hoja, y el fondo se libera al cerrarla', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/proyectos/1/actividades');
    await expect(page.locator('app-activities-page .cards li')).toHaveCount(5);
    // En móvil lo que se desplaza es <main>; el bloqueo se ve en su overflow.
    const bodyOverflow = () =>
      page.evaluate(() => getComputedStyle(document.querySelector('main')!).overflowY);
    expect(await bodyOverflow()).not.toBe('hidden');

    await page.getByRole('button', { name: 'Nueva actividad' }).click();
    await expect(page.getByRole('dialog', { name: 'Nueva actividad' })).toBeVisible();
    await settledBox(page.getByRole('dialog', { name: 'Nueva actividad' }));
    await expect.poll(bodyOverflow).toBe('hidden');
    await expect(page.locator('app-dialog .panel')).toHaveCSS('overscroll-behavior-y', 'contain');

    // El pie de la hoja queda dentro de la pantalla al llegar al final de su propio scroll.
    await page.locator('app-dialog .panel').evaluate((panel) => {
      panel.scrollTop = panel.scrollHeight;
    });
    const cancel = page.getByRole('dialog').getByRole('button', { name: 'Cancelar' });
    const box = (await cancel.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const center = box.x + box.width / 2;
    expect(Math.abs(center - page.viewportSize()!.width / 2)).toBeLessThan(2);

    await cancel.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // La capa se destruye en el siguiente ciclo de detección de cambios: se espera, no se asume.
    await expect.poll(bodyOverflow).not.toBe('hidden');

    // La hoja del selector también bloquea el fondo y centra su "Cancelar".
    await page.getByRole('button', { name: 'Cambiar de proyecto' }).click();
    await expect(page.getByRole('listbox', { name: 'Proyecto activo' })).toBeVisible();
    await expect.poll(bodyOverflow).toBe('hidden');
    const pickerCancel = page.locator('app-project-picker .cancel');
    const pickerBox = (await pickerCancel.boundingBox())!;
    expect(
      Math.abs(pickerBox.x + pickerBox.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThan(2);
    await pickerCancel.click();
    await expect.poll(bodyOverflow).not.toBe('hidden');
  });
});
