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

  for (const view of ['Start', 'Lernen', 'Prüfung', 'Fortschritt', 'Kataloge', 'Einstellungen']) {
    await page.getByRole('button', { name: new RegExp(view, 'i') }).click();
    await expect(page.locator('.app-header h1')).toBeVisible();
  }

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-header h1')).toBeVisible();

  await page.goto('/datenschutz.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Datenschutzhinweise' })).toBeVisible();

  await context.setOffline(false);
  expect(runtimeErrors, `Unexpected browser runtime errors: ${runtimeErrors.join(' | ')}`).toEqual([]);
});
