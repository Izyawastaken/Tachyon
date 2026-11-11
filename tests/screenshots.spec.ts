import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, mode = '') {
  // Deliberately simple image fixtures exercise intrinsic ratios without a network dependency.
  await page.route('**/asset.localhost/**', route => {
    const i = Number(route.request().url().match(/shot-(\d+)/)?.[1] ?? 0);
    const width = i % 4 === 0 ? 900 : 1920;
    const height = i % 4 === 0 ? 1200 : i % 4 === 1 ? 1920 : 1080;
    const colors = ['#2d5549', '#6c6650', '#354c66', '#66505d'];
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${colors[i % 4]}"/><path d="M0 ${height*.65}L${width*.3} ${height*.3}L${width*.6} ${height*.6}L${width} ${height*.4}V${height}H0Z" fill="#192c2b"/><text x="40" y="70" fill="white" font-size="40">Screenshot fixture ${i}</text></svg>` });
  });
  await page.goto(`/tests/screenshots-preview.html?mode=${mode}`);
  await page.getByRole('button', { name: 'Screenshots', exact: true }).hover();
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '268px');
  await page.getByRole('button', { name: 'Screenshots', exact: true }).click();
  await page.mouse.move(350, 100);
  await expect(page.getByRole('heading', { name: 'Screenshots', exact: true })).toBeVisible();
}

test('masonry reflows from its right edge and combines Minecraft filters', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const tiles = page.locator('.screenshots-masonry [role="listitem"]');
  await expect(tiles).toHaveCount(15);
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '80px');
  const before = await page.locator('#workspace').boundingBox();
  await page.getByRole('button', { name: 'Screenshot filters', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Minecraft version' })).toBeVisible();
  await expect.poll(async () => (await page.locator('#workspace').boundingBox())!.width).toBeLessThan(before!.width - 180);
  const after = await page.locator('#workspace').boundingBox();
  expect(after!.x).toBeCloseTo(before!.x, 0);
  await page.getByRole('combobox', { name: 'Minecraft version' }).selectOption('1.20.1');
  await page.getByRole('combobox', { name: 'Instance', exact: true }).selectOption('create');
  await page.getByRole('combobox', { name: 'Mod loader' }).selectOption('Forge');
  await expect(tiles).toHaveCount(5);
  await page.getByRole('combobox', { name: 'Orientation' }).selectOption('portrait');
  await expect(tiles).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Date taken' }).selectOption('7');
  await expect(tiles).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(tiles).toHaveCount(15);
  await expect.poll(() => tiles.evaluateAll(elements => {
    const boxes = elements.map(el => el.getBoundingClientRect());
    return boxes.every((box, i) => boxes.every((other, j) => i === j || box.right <= other.left + 1 || other.right <= box.left + 1 || box.bottom <= other.top + 1 || other.bottom <= box.top + 1));
  })).toBe(true);
  await page.screenshot({ path: 'tests/generated/screenshots-filters.png' });
  expect(errors).toEqual([]);
});

test('search, sort, lightbox navigation and escape work', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox', { name: 'Search screenshots' }).fill('hardcore');
  await expect(page.locator('.screenshots-masonry [role="listitem"]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Screenshot filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('oldest');
  await expect(page.locator('.screenshots-masonry [role="listitem"]').first()).toHaveAttribute('data-id', '13');
  await page.getByRole('button', { name: 'Close filters', exact: true }).click();
  await page.mouse.move(500, 200);
  const first = page.locator('.screenshots-masonry [data-card]').first();
  await first.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  const original = await page.getByRole('dialog').getAttribute('aria-label');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog')).not.toHaveAttribute('aria-label', original!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('sidebar scales the gallery without changing columns or tile placement', async ({ page }) => {
  await open(page);
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '80px');
  const masonry = page.locator('.screenshots-masonry');
  const tiles = masonry.locator('[role="listitem"]');
  await expect(tiles).toHaveCount(15);
  await expect.poll(() => tiles.first().evaluate(el => el.style.transform)).toBe('translate3d(0px, 0px, 0px) scale(1)');
  const layout = () => tiles.evaluateAll(elements => elements.map(el => ({
    id: el.getAttribute('data-id'), width: (el as HTMLElement).style.width, height: (el as HTMLElement).style.height,
  })));
  const before = await layout();
  const canvasWidth = await masonry.evaluate(el => el.clientWidth);
  const tileWidth = (await tiles.first().boundingBox())!.width;
  await page.getByRole('button', { name: 'Screenshots', exact: true }).hover();
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '268px');
  await expect.poll(async () => (await tiles.first().boundingBox())!.width).toBeLessThan(tileWidth - 20);
  expect(await masonry.evaluate(el => el.clientWidth)).toBe(canvasWidth);
  expect(await layout()).toEqual(before);
  await page.mouse.move(700, 100);
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '80px');
  await expect.poll(async () => (await tiles.first().boundingBox())!.width).toBeCloseTo(tileWidth, 0);
  expect(await layout()).toEqual(before);
  // Window resizing still recalculates the layout for a genuinely smaller screen.
  await page.setViewportSize({ width: 800, height: 1000 });
  await expect.poll(() => masonry.evaluate(el => el.clientWidth)).toBeLessThan(canvasWidth);
  await expect.poll(() => tiles.first().evaluate(el => el.style.width)).not.toBe(before[0].width);
});

test('empty, retry, cancelled linking and loading states stay usable', async ({ page }) => {
  await open(page, 'empty');
  await expect(page.getByText('Your next world is worth a screenshot')).toBeVisible();
  await open(page, 'error');
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.screenshots-masonry [role="listitem"]')).toHaveCount(15);
  await open(page, 'cancel');
  await page.getByRole('button', { name: 'Link instance', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Link instance', exact: true })).toBeEnabled();
  await expect(page.locator('.screenshots-masonry [role="listitem"]')).toHaveCount(15);
  await open(page, 'loading');
  await expect(page.getByLabel('Loading screenshots')).toBeVisible();
});

test('narrow layout and reduced motion keep the gallery and filters usable', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.getByRole('button', { name: 'Screenshot filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Minecraft version' }).selectOption('unknown');
  await expect(page.locator('.screenshots-masonry [role="listitem"]')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.screenshots-content').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'tests/generated/screenshots-narrow.png' });
});
