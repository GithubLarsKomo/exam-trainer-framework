import { expect, test } from '@playwright/test';

const focusId = 'decision-architecture-rights';

test('enterprise profile uses company branding and private catalog deep links', async ({ page }) => {
  await page.goto(
    `/?catalog=enterprise-leadership-n1&focus=${focusId}&mode=application`,
    { waitUntil: 'domcontentloaded' },
  );

  await expect(page.locator('.app-brand-lockup .brand-wordmark')).toContainText('Euroimmun');
  await expect(page.locator('[data-enterprise-access-warning]')).toBeVisible();

  await expect(page.locator('[data-recoverable-session]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.question-card h2')).toHaveText(
    'Eine Entscheidung wird formal im Team getroffen, tatsächlich warten alle auf informelles Okay von zwei Senior Leaders. Was änderst du?',
  );

  const localVersion = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('exam-trainer-framework', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const catalog = await new Promise<{ version?: string } | undefined>((resolve, reject) => {
      const request = db.transaction('catalogs', 'readonly').objectStore('catalogs').get('enterprise-leadership-n1');
      request.onsuccess = () => resolve(request.result as { version?: string } | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return catalog?.version;
  });
  expect(localVersion).toBe('0.3.0');

  const profileResponse = await page.request.get('/deployment-profile.json');
  expect(profileResponse.ok()).toBe(true);
  const profile = await profileResponse.json() as {
    id?: string;
    kind?: string;
    catalogPolicy?: { publicRegistry?: boolean };
    privateCatalogs?: Array<{ id?: string; version?: string }>;
  };
  expect(profile.id).toBe('enterprise-euroimmun');
  expect(profile.kind).toBe('enterprise');
  expect(profile.catalogPolicy?.publicRegistry).toBe(false);
  expect(profile.privateCatalogs).toContainEqual(expect.objectContaining({
    id: 'enterprise-leadership-n1',
    version: '0.3.0',
  }));

  const registryResponse = await page.request.get('/catalogs/registry.json');
  expect(registryResponse.ok()).toBe(true);
  const registry = await registryResponse.json() as { catalogs?: Array<{ id?: string }> };
  expect(registry.catalogs?.some(entry => entry.id === 'enterprise-leadership-n1')).toBe(false);
});
