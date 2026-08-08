import { expect, test, type Page } from '@playwright/test';
import { card, seedCatalog, startLearning } from './helpers';

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

async function persistedSessionContains(page: Page, text: string): Promise<boolean> {
  return page.evaluate(async expected => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('exam-trainer-framework', 3);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = db.transaction('kv', 'readonly').objectStore('kv').get('state');
      request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return JSON.stringify(state.sessions ?? {}).includes(expected);
  }, text);
}

test('resumes an interrupted learning session and answer draft through keyboard controls', async ({ page }) => {
  await seedCatalog(page, [card('free_text', { id: 'a11y-resume', prompt: 'Keyboard resume flow' })]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await startLearning(page);

  const answer = page.locator('textarea#answer');
  await answer.fill('Persisted keyboard resume answer');
  await expect.poll(() => persistedSessionContains(page, 'Persisted keyboard resume answer')).toBe(true);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const resume = page.locator('[data-recoverable-resume]');
  await expect(resume).toBeVisible();
  await expect(page.locator('[data-recoverable-session]')).toHaveCount(0);

  await focusByTab(page, '[data-recoverable-resume]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
  await expect(page.locator('textarea#answer')).toHaveValue('Persisted keyboard resume answer');
});
