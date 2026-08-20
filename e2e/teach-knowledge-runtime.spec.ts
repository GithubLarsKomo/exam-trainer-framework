import { expect, test, type Page } from '@playwright/test';
import { startLearning } from './helpers';

const at = '2026-08-20T10:00:00.000Z';

async function seedTeachCatalog(page: Page): Promise<void> {
  const catalog = {
    catalogId: 'teach-e2e',
    title: 'Teach E2E',
    version: '1.0.0',
    createdAt: at,
    updatedAt: at,
    cards: [],
    origin: { type: 'skillz-teach', missionId: 'mission-e2e' },
    knowledgeItems: [
      {
        id: 'ki-e2e',
        version: 1,
        status: 'released',
        topicId: 'Teach',
        title: 'Semantic E2E concept',
        canonicalContent: 'One semantic learning object with multiple retrieval surfaces.',
        tags: ['teach', 'e2e'],
        source: 'E2E fixture',
        changedAt: at,
        learningObjective: 'Use one semantic item through multiple question variants.',
        competencyClass: 'application',
        origin: { type: 'skillz-teach', missionId: 'mission-e2e' },
        questionVariants: [
          {
            id: 'ki-e2e:q-recall',
            knowledgeItemId: 'ki-e2e',
            version: 1,
            status: 'released',
            topicId: 'Teach',
            examQuestion: '1',
            prompt: 'Recall variant prompt',
            points: 1,
            difficulty: 1,
            tags: ['recall'],
            questionType: 'free_text',
            answer: { modelAnswer: 'Recall answer', requiredTerms: [] },
            source: 'E2E fixture',
            changedAt: at,
          },
          {
            id: 'ki-e2e:q-apply',
            knowledgeItemId: 'ki-e2e',
            version: 1,
            status: 'released',
            topicId: 'Teach',
            examQuestion: '2',
            prompt: 'Application variant prompt',
            points: 1,
            difficulty: 3,
            tags: ['application'],
            questionType: 'free_text',
            answer: { modelAnswer: 'Application answer', requiredTerms: [] },
            source: 'E2E fixture',
            changedAt: at,
          },
        ],
      },
    ],
  };

  const state = {
    schemaVersion: 3,
    progress: {},
    history: [],
    reviewEvents: [],
    fsrsShadow: {},
    readinessSnapshots: [],
    review: {},
    sessions: {},
    examAttempts: [],
    migrationLog: [],
    activeCatalogId: catalog.catalogId,
  };

  await page.goto('/');
  await expect(page.locator('.app-header h1')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('nav.bottom-nav')).toBeVisible({ timeout: 10_000 });

  await page.evaluate(async ({ catalog, state }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const required = ['kv', 'catalogs', 'assets'];
    for (const name of required) {
      if (!db.objectStoreNames.contains(name)) {
        db.close();
        throw new Error(`Missing IndexedDB store: ${name}`);
      }
    }
    const tx = db.transaction(required, 'readwrite');
    tx.objectStore('kv').clear();
    tx.objectStore('catalogs').clear();
    tx.objectStore('assets').clear();
    tx.objectStore('kv').put(state, 'state');
    tx.objectStore('catalogs').put(catalog);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { catalog, state });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-header h1')).toHaveText('Teach E2E', { timeout: 10_000 });
}

async function readLearnerState(page: Page): Promise<{
  progress: Record<string, unknown>;
  reviewEvents: Array<{ knowledgeItemId: string; questionVariantId: string }>;
}> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('kv', 'readonly');
    const value = await new Promise<{
      progress: Record<string, unknown>;
      reviewEvents: Array<{ knowledgeItemId: string; questionVariantId: string }>;
    }>((resolve, reject) => {
      const req = tx.objectStore('kv').get('state');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  });
}

test('rotates native QuestionVariants while keeping one KnowledgeItem progress identity', async ({ page }) => {
  await seedTeachCatalog(page);

  await startLearning(page);
  await expect(page.locator('.question-card h2')).toHaveText('Recall variant prompt');
  await page.locator('[data-reveal]').click();
  await page.locator('[data-grade="correct"]').click();
  await expect(page.getByText('Sitzung abgeschlossen')).toBeVisible();

  await expect.poll(async () => (await readLearnerState(page)).reviewEvents.length).toBe(1);
  await page.locator('main [data-view="home"]').click();

  await startLearning(page);
  await expect(page.locator('.question-card h2')).toHaveText('Application variant prompt');
  await page.locator('[data-reveal]').click();
  await page.locator('[data-grade="partial"]').click();
  await expect(page.getByText('Sitzung abgeschlossen')).toBeVisible();

  await expect.poll(async () => (await readLearnerState(page)).reviewEvents.length).toBe(2);
  const persisted = await readLearnerState(page);
  expect(Object.keys(persisted.progress)).toEqual(['ki-e2e']);
  expect(persisted.reviewEvents.map(event => ({
    knowledgeItemId: event.knowledgeItemId,
    questionVariantId: event.questionVariantId,
  }))).toEqual([
    { knowledgeItemId: 'ki-e2e', questionVariantId: 'ki-e2e:q-recall' },
    { knowledgeItemId: 'ki-e2e', questionVariantId: 'ki-e2e:q-apply' },
  ]);
});
