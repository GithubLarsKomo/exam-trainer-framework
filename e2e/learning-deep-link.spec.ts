import { expect, test, type Page } from '@playwright/test';
import { seedCatalog } from './helpers';

const at = '2026-09-18T12:00:00.000Z';
const focusId = 'decision-architecture-rights';

const knowledgeItem = {
  id: focusId,
  version: 1,
  status: 'released',
  topicId: 'Organisation',
  title: 'Entscheidungsarchitektur und Eskalation',
  tags: ['leadership', 'deep-link-e2e'],
  source: 'Unternehmen mitführen',
  changedAt: at,
  questionVariants: [
    {
      id: `${focusId}:retrieval`,
      knowledgeItemId: focusId,
      version: 1,
      status: 'released',
      topicId: 'Organisation',
      examQuestion: 'Retrieval',
      prompt: 'Retrieval prompt',
      points: 1,
      difficulty: 1,
      tags: ['retrieval'],
      questionType: 'free_text',
      answer: { modelAnswer: 'Retrieval answer' },
      source: 'Unternehmen mitführen',
      changedAt: at,
      competencyClass: 'knowledge',
    },
    {
      id: `${focusId}:application`,
      knowledgeItemId: focusId,
      version: 1,
      status: 'released',
      topicId: 'Organisation',
      examQuestion: 'Application',
      prompt: 'Application prompt',
      points: 1,
      difficulty: 2,
      tags: ['application'],
      questionType: 'free_text',
      answer: { modelAnswer: 'Application answer' },
      source: 'Unternehmen mitführen',
      changedAt: at,
      competencyClass: 'application',
    },
    {
      id: `${focusId}:transfer`,
      knowledgeItemId: focusId,
      version: 1,
      status: 'released',
      topicId: 'Organisation',
      examQuestion: 'Transfer',
      prompt: 'Transfer prompt',
      points: 1,
      difficulty: 3,
      tags: ['transfer'],
      questionType: 'free_text',
      answer: { modelAnswer: 'Transfer answer' },
      source: 'Unternehmen mitführen',
      changedAt: at,
      competencyClass: 'transfer',
    },
  ],
};

async function addKnowledgeItem(page: Page): Promise<void> {
  await page.evaluate(async item => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('catalogs', 'readwrite');
    const store = tx.objectStore('catalogs');
    const catalog = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const req = store.get('e2e-catalog');
      req.onsuccess = () => resolve(req.result as Record<string, unknown>);
      req.onerror = () => reject(req.error);
    });
    catalog.knowledgeItems = [item];
    store.put(catalog);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, knowledgeItem);
}

async function localCatalogVersion(page: Page, catalogId: string): Promise<string | undefined> {
  return page.evaluate(async id => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const catalog = await new Promise<{ version?: string } | undefined>((resolve, reject) => {
      const req = db.transaction('catalogs', 'readonly').objectStore('catalogs').get(id);
      req.onsuccess = () => resolve(req.result as { version?: string } | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return catalog?.version;
  }, catalogId);
}

test('opens a focused application session from an ETF learning deep link', async ({ page }) => {
  await seedCatalog(page, []);
  await addKnowledgeItem(page);

  await page.goto(
    `/?catalog=e2e-catalog&focus=${focusId}&mode=practice`,
    { waitUntil: 'domcontentloaded' },
  );

  await expect(page.locator('[data-recoverable-session]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.question-card h2')).toHaveText('Application prompt');

  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      catalog: url.searchParams.get('catalog'),
      focus: url.searchParams.get('focus'),
      mode: url.searchParams.get('mode'),
    };
  }).toEqual({ catalog: null, focus: null, mode: null });
});

test('offers one-click verified install for a published catalog and starts the requested focus', async ({ page }) => {
  await seedCatalog(page, []);

  await page.goto(
    `/?catalog=enterprise-leadership-n1&focus=${focusId}&mode=practice`,
    { waitUntil: 'domcontentloaded' },
  );

  const notice = page.locator('[data-learning-deep-link-notice]');
  await expect(notice).toBeVisible({ timeout: 10_000 });
  await expect(notice).toContainText('Freigegebener Katalog verfügbar');

  const install = notice.getByRole('button', { name: 'Katalog installieren & starten' });
  await expect(install).toBeVisible();
  await install.click();

  await expect(page.locator('[data-recoverable-session]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.question-card h2')).toHaveText(
    'Eine Entscheidung wird formal im Team getroffen, tatsächlich warten alle auf informelles Okay von zwei Senior Leaders. Was änderst du?',
  );
  await expect.poll(() => localCatalogVersion(page, 'enterprise-leadership-n1')).toBe('0.3.0');

  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      catalog: url.searchParams.get('catalog'),
      focus: url.searchParams.get('focus'),
      mode: url.searchParams.get('mode'),
    };
  }).toEqual({ catalog: null, focus: null, mode: null });
});

test('does not silently import an unpublished missing catalog', async ({ page }) => {
  await seedCatalog(page, []);

  await page.goto(
    `/?catalog=missing-leadership&focus=${focusId}&mode=practice`,
    { waitUntil: 'domcontentloaded' },
  );

  const notice = page.locator('[data-learning-deep-link-notice]');
  await expect(notice).toBeVisible({ timeout: 10_000 });
  await expect(notice).toContainText('Katalog noch nicht lokal verfügbar');
  await expect(page.locator('[data-recoverable-session]')).toHaveCount(0);
});
