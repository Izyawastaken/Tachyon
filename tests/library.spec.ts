import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, mode = '') {
  await page.goto(`/tests/library-preview.html?mode=${mode}`);
  await page.getByRole('button', { name: 'Library', exact: true }).hover();
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '268px');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.mouse.move(700, 100);
  await expect(page.getByRole('heading', { name: 'Your little universes.' })).toBeVisible();
}
async function pod(page: Page) {
  await page.getByRole('button', { name: 'Open A quieter world', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A quieter world', exact: true })).toBeVisible();
}

test('pod cards, library search, favorites and return state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page);
  await expect(page.locator('.library-pod')).toHaveCount(4);
  await page.screenshot({ path: 'tests/generated/library-overview.png' });
  await page.getByRole('button', { name: 'Favorites', exact: false }).click();
  await expect(page.locator('.library-pod')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Search pods', exact: true }).fill('quiet');
  await expect(page.locator('.library-pod')).toHaveCount(1);
  await pod(page);
  await page.getByRole('button', { name: 'All pods', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search pods', exact: true })).toHaveValue('quiet');
  await expect(page.getByRole('button', { name: 'Open A quieter world' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('installed content filters, toggles and mini catalog install stay in the pod', async ({ page }) => {
  await open(page); await pod(page);
  await expect(page.locator('.pod-content-row')).toHaveCount(5);
  await page.getByRole('combobox', { name: 'State', exact: true }).selectOption('Disabled');
  await expect(page.locator('.pod-content-row')).toHaveCount(1);
  await page.getByRole('switch', { name: 'Enable AppleSkin' }).click();
  await expect(page.locator('.pod-content-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Performance');
  await expect(page.locator('.pod-content-row')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('All categories');
  await page.screenshot({ path: 'tests/generated/library-content.png' });
  await page.getByRole('button', { name: 'Add mods', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add content', exact: true });
  await expect(dialog).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search catalog', exact: true }).fill('Lithium');
  await page.getByRole('button', { name: 'View Lithium', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Lithium', exact: true })).toBeVisible();
  await page.screenshot({ path: 'tests/generated/library-mini-explore.png' });
  await page.getByRole('button', { name: 'Install in pod', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Installed', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add mods', exact: true })).toBeFocused();
  await expect(page.locator('.pod-content-row').filter({ hasText: 'Lithium' })).toHaveCount(1);
  await expect(page.locator('.pod-content-row')).toHaveCount(6);
});

test('recursive file search, folder navigation and file previews', async ({ page }) => {
  await open(page); await pod(page);
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search files', exact: true });
  await search.fill('player.dat');
  await expect(page.locator('.pod-file-row')).toHaveCount(1);
  await expect(page.locator('.pod-file-row')).toContainText('saves/Meadow/playerdata/player.dat');
  await page.getByRole('checkbox', { name: 'Include subfolders' }).uncheck();
  await expect(page.locator('.pod-file-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset file search' }).click();
  await page.getByRole('button', { name: 'config Folder', exact: false }).click();
  await expect(page.locator('.pod-file-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'sodium-options.json', exact: false }).click();
  await expect(page.getByRole('dialog')).toContainText('use_block_face_culling');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Content', exact: true }).click();
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await expect(page.locator('.pod-file-row')).toHaveCount(2);
});

test('world details, logs, keyboard tabs and settings', async ({ page }) => {
  await open(page); await pod(page);
  await page.getByRole('tab', { name: 'Worlds', exact: true }).click();
  await page.getByRole('button', { name: 'Survival Meadow', exact: false }).click();
  await expect(page.getByRole('dialog', { name: 'World details' })).toContainText('648093274');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Logs', exact: true }).click();
  await page.getByRole('combobox', { name: 'Log level', exact: true }).selectOption('WARN');
  await expect(page.locator('.pod-log-view code')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Logs', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Share', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('textbox', { name: 'Pod name', exact: true }).fill('A renamed world');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A renamed world' })).toBeVisible();
  await page.getByRole('button', { name: 'All pods', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open A renamed world' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).hover();
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '268px');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next great mod.' })).toBeVisible();
  await expect(page.locator('#workspace')).toHaveCount(1);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.mouse.move(700, 100);
  await expect(page.getByRole('button', { name: 'Open A renamed world' })).toBeVisible();
});

test('create a custom pod and import only a repository link, with retry', async ({ page }) => {
  await open(page, 'error');
  await page.getByRole('button', { name: 'Create a pod', exact: true }).click();
  await page.getByRole('button', { name: 'Create a custom pod', exact: false }).click();
  await page.getByRole('textbox', { name: 'Pod name', exact: true }).fill('A fresh start');
  await page.getByRole('combobox', { name: 'Mod loader', exact: true }).selectOption('Vanilla');
  await page.getByRole('button', { name: 'Create pod', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start' })).toBeVisible();
  await expect(page.locator('.pod-content-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'All pods', exact: true }).click();
  await expect(page.locator('.library-pod')).toHaveCount(5);
  await page.getByRole('button', { name: 'Create a pod', exact: true }).click();
  await page.getByRole('button', { name: 'Import from a code', exact: false }).click();
  await page.getByRole('textbox', { name: 'Repository share code', exact: true }).fill('1b6f8tgk');
  await page.getByRole('button', { name: 'Find repository', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('GitHub could not be reached');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Find repository', exact: true }).click();
  await expect(page.locator('.pod-resolved')).toContainText('https://github.com/Izyawastaken/Tachyon');
  await expect.poll(() => page.locator('.pod-import [data-filled] > span:last-child').evaluateAll(elements => elements.every(el => Number(getComputedStyle(el).opacity) > .99))).toBe(true);
  await page.screenshot({ path: 'tests/generated/library-import.png' });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tachyon', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Share', exact: true }).click();
  await expect(page.locator('.pod-source-link')).toHaveText('https://github.com/Izyawastaken/Tachyon');
  expect(await page.evaluate(() => (window as any).libraryCalls)).toEqual([
    { command: 'library_resolve_code', args: { code: '1B6F8TGK' } },
    { command: 'library_resolve_code', args: { code: '1B6F8TGK' } },
  ]);
});

test('compact layout and reduced motion remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page); await pod(page);
  await page.getByRole('button', { name: 'Add mods', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add content' })).toBeVisible();
  await expect.poll(() => page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'All pods', exact: true }).click();
  await page.getByRole('button', { name: 'Create a pod', exact: true }).click();
  await page.getByRole('button', { name: 'Import from a code', exact: false }).click();
  await expect.poll(() => page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'tests/generated/library-compact.png' });
});
