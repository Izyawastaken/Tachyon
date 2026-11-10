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

test('sidebar morphs hold the visible frame, suspend GPU work, then resize once', async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { draws: 0, resizes: 0, changes: [] as string[] };
    Object.assign(window, { skinGPU: metrics });
    for (const dimension of ['width', 'height']) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
      Object.defineProperty(HTMLCanvasElement.prototype, dimension, {
        ...descriptor,
        set(value: number) {
          if (this.parentElement?.classList.contains('skin-preview-scene') && descriptor.get!.call(this) !== value) { metrics.resizes++; metrics.changes.push(`${dimension}: ${descriptor.get!.call(this)} → ${value} @ ${Math.round(performance.now())}`); }
          descriptor.set!.call(this, value);
        },
      });
    }
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = type.prototype.drawElements;
      type.prototype.drawElements = function (...args) {
        if (this.canvas instanceof HTMLCanvasElement && this.canvas.parentElement?.classList.contains('skin-preview-scene')) metrics.draws++;
        return original.apply(this, args);
      };
    }
  });
  const metrics = () => page.evaluate(() => (window as typeof window & { skinGPU: { draws: number; resizes: number } }).skinGPU);
  const canvas = page.locator('.skin-preview-scene canvas');
  const shirtPixels = async () => {
    const bounds = await canvas.boundingBox();
    const screenshot = await page.screenshot({ animations: 'allow', clip: bounds! });
    return page.evaluate(async encoded => {
      const image = new Image(); image.src = `data:image/png;base64,${encoded}`; await image.decode();
      const sample = document.createElement('canvas'); sample.width = image.width; sample.height = image.height;
      const context = sample.getContext('2d')!; context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, image.width, image.height).data;
      let pixels = 0;
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i] < 100 && rgba[i + 1] > 65 && rgba[i + 1] > rgba[i] * 1.5 && rgba[i + 2] > rgba[i + 1] * .7) pixels++;
      return pixels;
    }, screenshot.toString('base64'));
  };
  await page.goto('/tests/skins-preview.html');
  await page.getByRole('button', { name: 'Skins', exact: true }).click();
  await page.locator('.skins-heading').hover();
  await expect.poll(() => page.locator('.shell-rail').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(80);
  await expect(page.locator('.skin-preview-status')).toHaveCount(0, { timeout: 20000 });
  await expect.poll(async () => Math.abs(await canvas.evaluate(c => c.width / Math.min(devicePixelRatio, 1.5) - c.getBoundingClientRect().width))).toBeLessThan(2);
  expect(await shirtPixels()).toBeGreaterThan(200);
  for (const expanded of [true, false, true, false]) {
    const before = await metrics();
    if (expanded) await page.getByRole('button', { name: 'Tachyon', exact: true }).hover();
    else await page.locator('.skins-heading').hover();
    // Observe a real intermediate layout rather than waiting for a finished spring.
    await expect.poll(() => page.locator('.shell-rail').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(90);
    const frozen = await metrics();
    expect(frozen.resizes).toBe(before.resizes);
    expect(await shirtPixels()).toBeGreaterThan(200);
    await expect.poll(() => page.locator('.shell-rail').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(expanded ? 268 : 80);
    await expect.poll(async () => Math.abs(await canvas.evaluate(c => c.width / Math.min(devicePixelRatio, 1.5) - c.getBoundingClientRect().width))).toBeLessThan(2);
    const settled = await metrics();
    expect(settled.resizes - before.resizes, JSON.stringify(settled)).toBeLessThanOrEqual(2);
    await expect.poll(async () => (await metrics()).draws).toBeGreaterThan(settled.draws);
  }
  // Still mode must also survive the resize and remain idle after its one repaint.
  await page.getByRole('combobox', { name: 'Preview animation' }).selectOption('still');
  await page.getByRole('button', { name: 'Tachyon', exact: true }).hover();
  await expect.poll(() => page.locator('.shell-rail').evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(268);
  await expect.poll(async () => Math.abs(await canvas.evaluate(c => c.width / Math.min(devicePixelRatio, 1.5) - c.getBoundingClientRect().width))).toBeLessThan(2);
  expect(await shirtPixels()).toBeGreaterThan(200);
  const still = await metrics();
  await page.waitForTimeout(180);
  expect((await metrics()).draws).toBe(still.draws);
});
