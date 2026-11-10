import { expect, test } from '@playwright/test';

test('skin library, model selection, import, favorites and recovery controls', async ({ page }) => {
  const errors: string[] = [];
  const remote: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://localhost:1420/')) remote.push(request.url()); });
  await page.goto('/tests/skins-preview.html');
  await page.getByRole('button', { name: 'Skins', exact: true }).click();
  await page.locator('.skins-heading').hover();
  await expect.poll(() => page.locator('.shell-rail').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(80);
  await expect(page.getByRole('heading', { name: 'A little more you.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Active in Tachyon' })).toBeDisabled();
  await expect(page.locator('.skin-preview-scene canvas')).toBeVisible();
  await expect(page.locator('.skin-preview-status')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('.skin-preview-fallback')).toHaveCount(0);
  await expect(page.locator('.skin-tile')).toHaveCount(10);
  await page.screenshot({ path: process.env.TACHYON_SKINS_SCREENSHOT ?? 'tests/generated/skins-studio.png' });

  await page.getByRole('button', { name: /Alex Minecraft original/ }).click();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Slim 3 px arms' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Use skin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Active in Tachyon' })).toBeDisabled();
  await page.getByRole('button', { name: 'Classic 4 px arms' }).click();
  await expect(page.getByRole('button', { name: 'Use skin', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Use skin', exact: true }).click();
  await page.getByRole('button', { name: 'Favorite Alex', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.locator('.skin-tile')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search skins' }).fill('no match');
  await expect(page.getByRole('heading', { name: 'No matching skins' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all skins' }).click();

  await page.getByRole('button', { name: 'Add skin', exact: true }).click();
  await page.getByRole('button', { name: 'Player', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Java username or player UUID' })).toBeFocused();
  await page.getByRole('textbox', { name: 'Java username or player UUID' }).fill('invalid_user');
  await page.getByRole('button', { name: 'Import skin', exact: true }).click();
  await expect(page.locator('.skins-feedback')).toContainText('No Java player was found');
  await page.getByRole('textbox', { name: 'Java username or player UUID' }).fill('Notch');
  await page.getByRole('button', { name: 'Import skin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample skin', exact: true })).toBeVisible();
  await expect(page.locator('#skin-import-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rename skin' }).click();
  await page.getByRole('textbox', { name: 'Skin name' }).fill('My adventure skin');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'My adventure skin' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove skin' }).click();
  await expect(page.locator('.skin-tile')).toHaveCount(9);
  await page.getByRole('button', { name: 'Undo remove' }).click();
  await expect(page.locator('.skin-tile')).toHaveCount(10);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-export-requested', 'builtin-alex');
  await page.getByRole('button', { name: 'Add skin', exact: true }).click();
  await page.getByRole('button', { name: 'Texture link', exact: true }).click();
  await page.getByRole('textbox', { name: 'Official Minecraft texture link' }).press('Escape');
  await expect(page.getByRole('button', { name: 'Add skin', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});

test('narrow viewport and reduced motion retain working selection controls', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/skins-preview.html');
  await page.getByRole('button', { name: 'Skins', exact: true }).click();
  await page.locator('.skins-heading').hover();
  await expect.poll(() => page.locator('.shell-rail').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(80);
  await page.getByRole('button', { name: /Alex Minecraft original/ }).click();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use skin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Active in Tachyon' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Preview animation' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tests/generated/skins-narrow.png', fullPage: true });
});

test('a lost graphics context falls back without losing skin selection', async ({ page }) => {
  await page.goto('/tests/skins-preview.html');
  await page.getByRole('button', { name: 'Skins', exact: true }).click();
  await page.locator('.skins-heading').hover();
  await expect(page.getByRole('button', { name: 'Rotate skin left' })).toBeEnabled({ timeout: 20000 });
  await page.locator('.skin-preview-scene canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('.skin-preview-fallback')).toContainText('lost its graphics connection');
  await page.getByRole('button', { name: /Alex Minecraft original/ }).click();
  await page.getByRole('button', { name: 'Use skin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Active in Tachyon' })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry 3D preview' }).click();
  await expect(page.locator('.skin-preview-fallback')).toHaveCount(0);
});

test('a failed local texture can be retried without remounting the page', async ({ page }) => {
  let fail = true;
  await page.route('**/tests/generated/skins/steve-classic.png', route => fail ? route.abort() : route.continue());
  await page.goto('/tests/skins-preview.html');
  await page.getByRole('button', { name: 'Skins', exact: true }).click();
  await page.locator('.skins-heading').hover();
  await expect(page.locator('.skin-preview-fallback')).toContainText('texture could not load', { timeout: 20000 });
  fail = false;
  await page.getByRole('button', { name: 'Retry 3D preview' }).click();
  await expect(page.locator('.skin-preview-fallback')).toHaveCount(0);
  await expect(page.locator('.skin-preview-status')).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Active in Tachyon' })).toBeDisabled();
});
