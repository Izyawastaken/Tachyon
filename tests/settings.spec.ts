import { expect, test, type Page } from '@playwright/test';
import { CATEGORIES, DEFAULTS, STORAGE_KEY } from '../src/features/settings/model';

async function open(page: Page) {
  await page.goto('/tests/settings-preview.html');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.mouse.move(700, 100);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
}
const section = (page: Page, name: string) => page.getByRole('navigation', { name: 'Settings categories' }).getByRole('button', { name, exact: true }).click();

test('every category opens, controls persist, and search finds settings and maintenance actions', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('日本語');
  await page.getByRole('switch', { name: 'Launch on startup', exact: true }).click();
  for (const category of CATEGORIES) {
    await section(page, category.label);
    await expect(page.getByRole('heading', { name: category.label, exact: true })).toBeVisible();
  }
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('searchbox', { name: 'Search settings' })).toBeFocused();
  await page.getByRole('searchbox').fill('memory');
  await expect(page.getByRole('spinbutton', { name: 'Maximum memory', exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('prune');
  await expect(page.getByRole('button', { name: 'Dry-run preview', exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('no-match-here');
  await expect(page.getByText('A different word might do it.')).toBeVisible();
  await open(page);
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue('日本語');
  await expect(page.getByRole('switch', { name: 'Launch on startup', exact: true })).toBeChecked();
  await page.screenshot({ path: 'tests/generated/settings-general.png' });
  expect(errors).toEqual([]);
});

test('instance overrides cascade and reset independently from global defaults', async ({ page }) => {
  await open(page); await section(page, 'Instances');
  await page.getByRole('combobox', { name: 'Default resolution' }).selectOption('2560 × 1440');
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('create');
  const resolution = page.locator('[data-setting=resolution]');
  await expect(resolution).toContainText('Inherited');
  await expect(page.getByRole('combobox', { name: 'Default resolution' })).toHaveValue('2560 × 1440');
  await page.getByRole('combobox', { name: 'Default resolution' }).selectOption('1280 × 720');
  await expect(resolution).toContainText('Overridden');
  await page.getByRole('switch', { name: 'Lock instance updates' }).click();
  await page.screenshot({ path: 'tests/generated/settings-inheritance.png' });
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('vanilla');
  await expect(page.getByRole('combobox', { name: 'Default resolution' })).toHaveValue('2560 × 1440');
  await expect(page.getByRole('switch', { name: 'Lock instance updates' })).not.toBeChecked();
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('create');
  await page.getByRole('button', { name: 'Reset Default resolution to inherited' }).click();
  await expect(resolution).toContainText('Inherited');
  await page.getByRole('button', { name: 'Reset Instances section' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset section', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Lock instance updates' })).not.toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Default resolution' })).toHaveValue('2560 × 1440');
});

test('runtime dependencies, memory limits and editable JVM presets behave coherently', async ({ page }) => {
  await open(page); await section(page, 'Java & runtime');
  await expect(page.getByRole('textbox', { name: 'Custom Java path' })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Java runtime', exact: true }).selectOption('Custom path');
  await expect(page.getByRole('textbox', { name: 'Custom Java path' })).toBeEnabled();
  await page.getByRole('switch', { name: 'Allocate memory automatically' }).click();
  await page.getByRole('spinbutton', { name: 'Minimum memory', exact: true }).fill('9');
  await expect(page.getByRole('spinbutton', { name: 'Maximum memory', exact: true })).toHaveValue('9');
  await page.getByRole('spinbutton', { name: 'Maximum memory', exact: true }).fill('4');
  await expect(page.getByRole('spinbutton', { name: 'Minimum memory', exact: true })).toHaveValue('4');
  await page.getByRole('combobox', { name: 'JVM argument preset' }).selectOption('ZGC');
  await expect(page.getByRole('textbox', { name: 'Default JVM arguments' })).toHaveValue('-XX:+UseZGC');
  await page.getByRole('textbox', { name: 'Default JVM arguments' }).fill('-XX:+UseG1GC -Dpreview=true');
  await expect(page.getByRole('combobox', { name: 'JVM argument preset' })).toHaveValue('Custom');
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('create');
  await page.getByRole('spinbutton', { name: 'Maximum memory', exact: true }).fill('12');
  await expect(page.locator('[data-setting=memoryMin]')).toContainText('Overridden');
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('global');
  await page.getByRole('button', { name: 'Reset Java & runtime section' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset section', exact: true }).click();
  await open(page); await section(page, 'Java & runtime');
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('create');
  await expect(page.getByRole('spinbutton', { name: 'Maximum memory', exact: true })).toHaveValue('12');
});

test('prune previews are cancellable and cache layers clear independently', async ({ page }) => {
  await open(page); await section(page, 'Garden & pots');
  await page.getByRole('button', { name: 'Dry-run preview' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('248 MB');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.screenshot({ path: 'tests/generated/settings-prune.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dry-run preview' })).toBeFocused();
  await expect(page.getByText('12 orphaned references · 248 MB could be reclaimed.')).toBeVisible();
  await page.getByRole('button', { name: 'Dry-run preview' }).click();
  await dialog.getByRole('button', { name: 'Prune sample files' }).click();
  await expect(page.getByText('Your sample garden is tidy. No unreferenced files remain.')).toBeVisible();
  await section(page, 'Engram & Decker');
  await page.getByRole('button', { name: 'Clear L1', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.settings-cache-layers')).toContainText('L1 · 42 MB');
  await page.getByRole('button', { name: 'Clear L1', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear preview cache' }).click();
  await expect(page.locator('.settings-cache-layers')).toContainText('L1 · 0 MB');
  await expect(page.locator('.settings-cache-layers')).toContainText('L2 · 386 MB');
  await expect(page.getByRole('button', { name: 'Preview refresh' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Allow remote snapshot refresh' }).click();
  await page.getByRole('button', { name: 'Preview refresh' }).click();
  await dialog.getByRole('button', { name: 'Simulate refresh' }).click();
  await expect(page.getByText('Sample bundled snapshot · 2026-11-11 · 82,416 projects')).toBeVisible();
});

test('theme preview, contrast, density and motion work at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page); await section(page, 'Appearance');
  await page.getByRole('button', { name: 'Deep Plum', exact: true }).click();
  await expect(page.locator('.settings-page')).toHaveCSS('--theme-background', '#130f19');
  await expect(page.getByText('WCAG AA', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Interface density' }).selectOption('Compact');
  await page.getByRole('switch', { name: 'Reduced motion' }).click();
  await expect(page.locator('.settings-page')).toHaveAttribute('data-density', 'Compact');
  await expect(page.locator('.settings-page')).toHaveAttribute('data-reduced-motion', 'true');
  expect(await page.locator('.settings-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.locator('.settings-workspace').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.locator('.settings-scroll').evaluate(el => el.scrollTop = 0);
  await page.screenshot({ path: 'tests/generated/settings-narrow.png' });
});

test('shorter rollback retention requires a consequence preview and token input stays out of storage', async ({ page }) => {
  await open(page); await section(page, 'Sharing & Obscura');
  await page.getByRole('combobox', { name: 'Rollback retention' }).selectOption('7 days');
  await expect(page.getByRole('dialog')).toContainText('18 snapshots · 420 MB');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox', { name: 'Rollback retention' })).toHaveValue('30 days');
  await page.getByRole('combobox', { name: 'Connection method' }).selectOption('Token');
  await page.getByLabel('Sample token', { exact: true }).fill('mock-secret-not-to-persist');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).not.toContain('mock-secret-not-to-persist');
  await page.getByRole('button', { name: 'Link account', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simulate connection' }).click();
  await expect(page.getByText('Tachyon Gardener', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('create');
  const originalCode = await page.locator('.settings-share-code code').textContent();
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Regenerate sample code' }).click();
  await expect(page.locator('.settings-share-code code')).not.toHaveText(originalCode!);
  await page.getByRole('combobox', { name: 'Settings scope' }).selectOption('vanilla');
  await expect(page.locator('.settings-share-code code')).toHaveText('MOSS-7K2P');
});

test('data paths expose hardlink consequences and very narrow categories stay contained', async ({ page }) => {
  await open(page);
  await page.getByRole('textbox', { name: 'Data directory', exact: true }).fill('D:\\Tachyon');
  await expect(page.locator('.settings-paths')).toContainText('D:\\Tachyon\\garden');
  await section(page, 'Garden & pots');
  await page.getByRole('textbox', { name: 'Shared store location' }).fill('C:\\OtherGarden');
  await expect(page.getByText('These locations cannot be confirmed to share a filesystem.', { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 480, height: 900 });
  for (const name of ['General', 'Java & runtime', 'Garden & pots', 'Engram & Decker', 'Appearance', 'Sharing & Obscura', 'Accounts', 'Advanced']) {
    await section(page, name);
    expect(await page.locator('.settings-scroll').evaluate(el => el.scrollWidth <= el.clientWidth), name).toBe(true);
  }
});

test('settings import validates values, previews replacement and exports the same preferences', async ({ page }) => {
  await open(page); await section(page, 'Advanced');
  const file = page.getByLabel('Import settings file');
  await file.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, global: { ...DEFAULTS, memoryMin: 12, memoryMax: 2 } })) });
  await expect(page.getByRole('status')).toContainText('Minimum memory cannot exceed maximum memory.');
  const imported = { version: 1, global: { ...DEFAULTS, language: 'Deutsch' }, overrides: { create: { fullscreen: true } }, theme: 'plum' };
  await file.setInputFiles({ name: 'preferences.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByRole('dialog')).toContainText('preferences.json');
  await page.getByRole('dialog').getByRole('button', { name: 'Import settings', exact: true }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(saved.global.language).toBe('Deutsch');
  expect(saved.overrides.create.fullscreen).toBe(true);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export settings', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('tachyon-settings-preview.json');
});
