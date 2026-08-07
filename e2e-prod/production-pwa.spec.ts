import { expect, test } from '@playwright/test';

test('serves the production bundle through an active service worker and survives an offline reload', async ({ page, context }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('.app-header h1')).toBeVisible();
  await expect(page.getByRole('contentinfo', { name: 'Rechtliche Informationen' })).toBeVisible();

  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service workers are not available');
    await navigator.serviceWorker.ready;
  });

  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const primaryNav = page.locator('nav.bottom-nav');
  for (const view of ['Start', 'Lernen', 'Prüfung', 'Fortschritt', 'Kataloge', 'Einstellungen']) {
    await primaryNav.locator('button').filter({ hasText: view }).click();
    await expect(page.locator('.app-header h1')).toBeVisible();
  }

  await primaryNav.locator('button').filter({ hasText: 'Lernen' }).click();
  await expect(page.locator('#mode')).toBeVisible();
  await page.locator('#mode').selectOption('all');
  await page.locator('[data-start-custom]').click();
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
  await expect(page.locator('[data-recoverable-reveal]')).toBeVisible();
  await page.locator('[data-recoverable-reveal]').click();
  await expect(page.locator('[data-recoverable-grade="correct"]')).toBeVisible();
  await page.locator('[data-recoverable-grade="correct"]').click();

  await page.reload();
  await expect(page.locator('[data-recoverable-resume-banner]')).toBeVisible();
  await expect(primaryNav).toBeVisible();

  await primaryNav.locator('button').filter({ hasText: 'Prüfung' }).click();
  await expect(page.locator('#exam-mode')).toBeVisible();
  await page.locator('#exam-mode').selectOption('fixed');
  await page.locator('[data-exam]').click();
  await expect(page.locator('[data-recoverable-exam-nav]').first()).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-header h1')).toBeVisible();

  await page.goto('/datenschutz.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Datenschutzhinweise' })).toBeVisible();

  await context.setOffline(false);
  expect(runtimeErrors, `Unexpected browser runtime errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
});
