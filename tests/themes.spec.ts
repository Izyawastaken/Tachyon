import { expect, test, type Page } from '@playwright/test';
import { THEME_STORAGE_KEY } from '../src/features/themes/model';

async function open(page: Page) {
  await page.goto('/tests/settings-preview.html');
  await page.getByRole('button', { name: 'Themes', exact: true }).click();
  await page.mouse.move(700, 100);
  await expect(page.getByRole('heading', { name: 'Themes', exact: true })).toBeVisible();
}
async function canvas(page: Page) {
  await page.getByRole('tab', { name: 'Canvas' }).click();
  await expect(page.getByRole('button', { name: 'Edit Background color', exact: true })).toBeVisible();
}
async function color(page: Page, role: string, value: string) {
  await page.getByRole('button', { name: `Edit ${role} color`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Hex color', exact: true }).fill(value);
  await page.getByRole('textbox', { name: 'Hex color', exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Close color picker', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Hex color', exact: true })).toHaveCount(0);
}
async function rootTheme(page: Page) {
  return page.locator('html').getAttribute('data-theme');
}

test('five presets apply across the app, shared controls and reloads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('.themes-collection .theme-card')).toHaveCount(5);
  await page.screenshot({ path: 'tests/generated/themes-collection.png', fullPage: true });
  await page.getByRole('button', { name: 'Use Sakura Milk', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sakura');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  const aliases = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return [s.getPropertyValue('--background').trim(), s.getPropertyValue('--theme-background').trim(), s.getPropertyValue('--popover').trim(), s.getPropertyValue('--theme-surface').trim()];
  });
  expect(aliases[0]).toBe(aliases[1]); expect(aliases[2]).toBe(aliases[3]);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await rootTheme(page)).toBe('sakura');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sakura');
  await page.getByRole('button', { name: 'Themes', exact: true }).click();
  await page.mouse.move(700, 100);
  await page.screenshot({ path: 'tests/generated/themes-light.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('six pickers edit an isolated draft, reset, save, apply and retain it', async ({ page }) => {
  await open(page); await canvas(page);
  await expect(page.locator('.canvas-swatch')).toHaveCount(6);
  await color(page, 'Accent', '48A8BB');
  await expect(page.getByRole('button', { name: 'Edit Accent color', exact: true })).toContainText('#48A8BB');
  expect(await rootTheme(page)).toBe('espresso');
  await page.getByRole('button', { name: 'Reset palette', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit Accent color', exact: true })).toContainText('#754942');
  await color(page, 'Accent', '48A8BB');
  await page.getByRole('textbox', { name: 'Theme name' }).fill('Lagoon');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Themes', exact: true }).click();
  await canvas(page);
  await expect(page.getByRole('button', { name: 'Edit Accent color', exact: true })).toContainText('#48A8BB');
  await expect(page.getByRole('textbox', { name: 'Theme name' })).toHaveValue('Lagoon');
  await page.getByRole('button', { name: 'Save theme', exact: true }).click();
  expect(await rootTheme(page)).toBe('espresso');
  await page.getByRole('button', { name: 'Save & apply', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', /^custom-/);
  await page.reload();
  await page.getByRole('button', { name: 'Themes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use Lagoon', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), THEME_STORAGE_KEY);
  expect(stored.custom).toHaveLength(1); expect(stored.custom[0].colors.primary).toBe('#48A8BB');
  await page.getByRole('button', { name: 'Edit Lagoon in Canvas', exact: true }).click();
  await color(page, 'Accent', 'A8B848');
  await page.getByRole('button', { name: 'Save theme', exact: true }).click();
  await expect(page.locator('html')).toHaveCSS('--theme-primary', '#48A8BB');
  await page.getByRole('tab', { name: 'Collection' }).click();
  await expect(page.getByRole('button', { name: 'Use Lagoon copy', exact: true })).toBeVisible();
});

test('supplied palette filtering, invalid hex and text contrast work', async ({ page }) => {
  await open(page); await canvas(page);
  await page.getByRole('button', { name: 'Edit Accent color', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter colors' }).fill('blue');
  await expect(page.getByRole('button', { name: 'blue-500', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'red-500', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'tests/generated/themes-picker.png', fullPage: true });
  await page.getByRole('button', { name: 'blue-500', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hex color' }).fill('invalid');
  await page.getByRole('textbox', { name: 'Hex color' }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Hex color' })).toHaveValue('2B7FFF');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit Accent color', exact: true })).toBeFocused();
  await color(page, 'Text', '0D0807');
  await expect(page.getByText('Low text contrast — try a lighter or darker text color.')).toBeVisible();
});

test('preview expands, traps focus, closes with Escape and restores focus', async ({ page }) => {
  await open(page); await canvas(page);
  await page.screenshot({ path: 'tests/generated/themes-canvas.png', fullPage: true });
  const trigger = page.getByRole('button', { name: 'Expand palette preview' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Expanded palette preview' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Close preview' })).toBeFocused();
  await expect.poll(async () => Math.round((await page.locator('.canvas-expanded-preview').boundingBox())?.y ?? 0)).toBe(56);
  await page.screenshot({ path: 'tests/generated/themes-expanded.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('custom themes duplicate, export and delete with cancellation', async ({ page }) => {
  await open(page); await canvas(page);
  await page.getByRole('textbox', { name: 'Theme name' }).fill('My Espresso');
  await page.getByRole('button', { name: 'Save theme', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export theme', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('my-espresso.json');
  await page.getByRole('button', { name: 'Save as a copy', exact: true }).click();
  await page.getByRole('tab', { name: 'Collection' }).click();
  await expect(page.getByRole('button', { name: 'Use My Espresso copy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use My Espresso', exact: true }).click();
  await page.getByRole('button', { name: 'Delete My Espresso', exact: true }).click();
  await page.getByRole('button', { name: 'Keep theme', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use My Espresso', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete My Espresso', exact: true }).click();
  await page.getByRole('button', { name: 'Delete theme', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use My Espresso', exact: true })).toHaveCount(0);
  expect(await rootTheme(page)).toBe('espresso');
});

test('corrupt saved palettes are ignored and unavailable storage is reported', async ({ page }) => {
  await page.addInitScript(({ key }) => localStorage.setItem(key, JSON.stringify({ version: 1, activeId: 'custom-invalid', custom: [{ id: 'custom-invalid', name: 'Broken', colors: { background: 'url(bad)' } }] })), { key: THEME_STORAGE_KEY });
  await open(page);
  expect(await rootTheme(page)).toBe('espresso');
  await expect(page.getByRole('button', { name: 'Use Broken', exact: true })).toHaveCount(0);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Use Deep Plum', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Device storage is unavailable');
  expect(await rootTheme(page)).toBe('plum');
});

test('Canvas adapts to narrow windows and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 540, height: 900 });
  await open(page); await canvas(page);
  await expect(page.locator('.canvas-swatch')).toHaveCount(6);
  await color(page, 'Background', '1A2431');
  await page.getByRole('button', { name: 'Expand palette preview' }).click();
  await expect(page.getByRole('dialog', { name: 'Expanded palette preview' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: 'tests/generated/themes-narrow.png', fullPage: true });
  expect(await page.locator('.themes-page').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test('appearance controls live in Themes, persist globally and set the initial sidebar state', async ({ page }) => {
  await open(page);
  await expect.poll(() => page.getByRole('button', { name: 'Themes', exact: true }).evaluate(node => node.nextElementSibling?.getAttribute('aria-label'))).toBe('Settings');
  await expect(page.getByRole('navigation', { name: 'Primary Navigation' }).getByRole('button', { name: 'Themes', exact: true })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Reduced motion' }).check();
  await page.getByRole('combobox', { name: 'Interface density' }).selectOption('Compact');
  await page.getByRole('combobox', { name: 'Default sidebar state' }).selectOption('Expanded');
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  await page.reload();
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '268px');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toHaveCount(0);
  await expect(page.locator('.settings-page')).toHaveAttribute('data-density', 'Compact');
  await expect(page.locator('.settings-page')).toHaveAttribute('data-reduced-motion', 'true');
  await page.keyboard.press('Control+Space');
  await expect(page.getByRole('dialog', { name: 'Tachyon Spotlight' })).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByRole('combobox', { name: 'Spotlight search' }).fill('Themes');
  await page.getByRole('option', { name: /Themes/ }).click();
  await expect(page.getByRole('heading', { name: 'Themes', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Default sidebar state' })).toHaveValue('Expanded');
});

test('former Appearance preferences migrate once without overriding later edits', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tachyon.settings-preview.v1', JSON.stringify({ version: 1, global: { reducedMotion: true, density: 'Compact', sidebar: 'Expanded' }, overrides: {}, theme: 'current' })));
  await open(page);
  await expect(page.getByRole('switch', { name: 'Reduced motion' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Interface density' })).toHaveValue('Compact');
  await expect(page.getByRole('combobox', { name: 'Default sidebar state' })).toHaveValue('Expanded');
  await page.getByRole('combobox', { name: 'Interface density' }).selectOption('Comfortable');
  await page.reload();
  await page.getByRole('button', { name: 'Themes', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Interface density' })).toHaveValue('Comfortable');
});
