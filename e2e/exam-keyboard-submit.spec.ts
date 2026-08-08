import { expect, test, type Page } from '@playwright/test';
import { card, seedCatalog } from './helpers';

async function focusByTab(page: Page, selector: string, maxTabs = 60): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate(target => document.activeElement?.matches(target) ?? false, selector);
    if (matched) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector} within ${maxTabs} Tab presses`);
}

async function reviewEventCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('exam-trainer-framework', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<{ reviewEvents?: unknown[] }>((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('state');
      request.onsuccess = () => resolve(request.result as { reviewEvents?: unknown[] });
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.reviewEvents?.length ?? 0;
  });
}

test('submits a completed examination and returns home through keyboard controls', async ({ page }) => {
  await seedCatalog(page, [card('free_text', { id: 'a11y-exam-submit', prompt: 'Keyboard exam submit' })]);
  await page.setViewportSize({ width: 1280, height: 800 });

  await focusByTab(page, 'nav.bottom-nav [data-view="exam"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('#exam-mode')).toBeVisible();
  await page.locator('#exam-mode').selectOption('fixed');

  await focusByTab(page, '[data-exam]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
  await expect.poll(() => reviewEventCount(page)).toBe(0);

  await focusByTab(page, '[data-recoverable-reveal]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.answer-box')).toBeVisible();

  await focusByTab(page, '[data-recoverable-grade="correct"]');
  await page.keyboard.press('Enter');
  const submit = page.locator('[data-recoverable-submit]');
  await expect(submit).toBeEnabled();
  await expect.poll(() => reviewEventCount(page)).toBe(0);

  await focusByTab(page, '[data-recoverable-submit]');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Prüfung abgegeben' })).toBeVisible();
  await expect(page.locator('[data-recoverable-session]')).toHaveCount(0);
  await expect.poll(() => reviewEventCount(page)).toBe(1);

  await focusByTab(page, '[data-recoverable-home]');
  await page.keyboard.press('Enter');
  await expect(page.locator('nav.bottom-nav')).toBeVisible();
  await expect(page.locator('nav.bottom-nav [data-view="home"]')).toHaveClass(/active/);
});
