import { expect, test } from '@playwright/test';

test('login, navigation, sign-out and reload keep the demo session honest', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
  await expect(page.getByText('This preview uses a demo profile. No Microsoft account is connected.')).toBeVisible();
  await page.mouse.move(1000, 300);
  await expect(page.locator('.shell-rail')).toHaveCSS('width', '80px');
  await page.screenshot({ path: 'tests/generated/auth-desktop.png' });
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await expect(page.getByRole('button', { name: 'Signing in…', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: "You're signed in." })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account', exact: true })).toHaveAttribute('title', 'Account: TachyonPlayer');
  await page.screenshot({ path: 'tests/generated/auth-signed-in.png' });
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next great mod.' })).toBeVisible();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await expect(page.locator('.login-profile')).toContainText('TachyonPlayer');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Microsoft' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await expect(page.getByRole('heading', { name: "You're signed in." })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Microsoft' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('cancel and retry ignore late results from the previous attempt', async ({ page }) => {
  await page.goto('/tests/auth-preview.html?mode=manual');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await page.getByRole('button', { name: 'Cancel sign-in' }).click();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await page.evaluate(() => (window as any).completeSignIn(0));
  await expect(page.getByRole('button', { name: 'Signing in…', exact: true })).toBeDisabled();
  await page.evaluate(() => (window as any).completeSignIn(1));
  await expect(page.getByRole('heading', { name: "You're signed in." })).toBeVisible();
});

test('leaving login cancels a pending sign-in', async ({ page }) => {
  await page.goto('/tests/auth-preview.html?mode=manual');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next great mod.' })).toBeVisible();
  await page.evaluate(() => (window as any).completeSignIn(0));
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Microsoft' })).toBeVisible();
});

test('sign-in failures can retry', async ({ page }) => {
  await page.goto('/tests/auth-preview.html?mode=sign-in-error');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await expect(page.locator('.login-error')).toHaveText("Couldn't sign in. Please try again.");
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await expect(page.getByRole('heading', { name: "You're signed in." })).toBeVisible();
});

test('failed sign-out retains the session and can retry', async ({ page }) => {
  await page.goto('/tests/auth-preview.html?mode=sign-out-error');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Microsoft' }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.login-error')).toHaveText("Couldn't sign out. Please try again.");
  await expect(page.locator('.login-profile')).toContainText('TachyonPlayer');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Microsoft' })).toBeVisible();
});

test('narrow and short layouts fit with keyboard controls and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.mouse.move(500, 100);
  const signIn = page.getByRole('button', { name: 'Continue with Microsoft' });
  await signIn.focus();
  await expect(signIn).toBeFocused();
  await page.screenshot({ path: 'tests/generated/auth-narrow.png' });
  await expect(page.locator('.login-page')).toBeVisible();
  expect(await page.locator('.login-page').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: "You're signed in." })).toBeVisible();
  await page.setViewportSize({ width: 800, height: 480 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(signIn).toBeVisible();
  await expect(page.locator('.login-footer')).toBeInViewport();
});
