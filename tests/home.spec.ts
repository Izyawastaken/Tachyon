import { expect, test } from '@playwright/test';
test('home loads independently, explains signals, opens mods and navigates', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/home-preview.html');
  await expect(page.getByRole('heading', { name: 'Your next great mod.' })).toBeVisible();
  await expect(page.locator('.home-mod-trending')).toHaveCount(8);
  await expect(page.locator('.home-mod-gems')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => (window as any).homeCalls)).toEqual({ trending: 1, gems: 1 });
  await page.screenshot({ path: 'tests/generated/home-desktop.png', fullPage: true });
  await page.getByText('How these picks work').click();
  await expect(page.locator('.home-footer details')).toContainText('not download growth');
  await page.getByRole('button', { name: 'View Sodium on Moddex', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-opened', 'https://moddex.gg/mod/sodium');
  await page.getByRole('button', { name: 'Explore all mods' }).click();
  await expect(page.locator('.explore-heading')).toBeVisible();
  expect(errors).toEqual([]);
});
test('one slow feed does not block the other', async ({ page }) => {
  await page.goto('/tests/home-preview.html?mode=loading');
  await expect(page.getByRole('status', { name: 'Loading trending mods' })).toBeVisible();
  await expect(page.locator('.home-mod-gems')).toHaveCount(2);
});
test('failed feed can retry while gems remain usable', async ({ page }) => {
  await page.goto('/tests/home-preview.html?mode=error');
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.locator('.home-mod-gems')).toHaveCount(2);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.home-mod-trending')).toHaveCount(8);
});
test('empty and stale feeds are honest and narrow layouts fit', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tests/home-preview.html?mode=empty');
  await expect(page.getByText('No recent community ratings to rank yet. Check back soon.')).toBeVisible();
  await expect(page.getByText('No mods meet the hidden-gem criteria right now.')).toBeVisible();
  await page.goto('/tests/home-preview.html?mode=stale');
  await expect(page.locator('.home-source-note').first()).toContainText('saved snapshot');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.home-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'tests/generated/home-narrow.png', fullPage: true });
});
