import { expect, type Page } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlJsStatic } from 'sql.js';

export type SeedAsset = {
  id: string;
  sha256: string;
  mediaType: string;
  kind: 'image' | 'audio' | 'other';
  byteLength: number;
  fileNames: string[];
  catalogIds: string[];
  source: 'anki' | 'local';
  createdAt: string;
  bytes: number[];
};

export type SeedCard = Record<string, unknown> & {
  id: string;
  version: number;
  status: string;
  topicId: string;
  examQuestion: string;
  prompt: string;
  points: number;
  difficulty: number;
  tags: string[];
  questionType: string;
  answer: Record<string, unknown>;
  source: string;
  changedAt: string;
};

const at = '2026-08-04T12:00:00.000Z';

export function card(type: string, extra: Partial<SeedCard> = {}): SeedCard {
  return {
    id: `e2e-${type}`,
    version: 1,
    status: 'released',
    topicId: 'E2E',
    examQuestion: 'E2E',
    prompt: `E2E ${type}`,
    points: 1,
    difficulty: 2,
    tags: ['e2e'],
    questionType: type,
    answer: { modelAnswer: 'Musterantwort', requiredTerms: [] },
    source: 'E2E fixture',
    sourcePage: '1',
    changedAt: at,
    ...extra,
  };
}

export const tinyPng = Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
  'base64',
));

export function imageAsset(catalogId = 'e2e-catalog'): SeedAsset {
  return {
    id: 'asset-e2e-png',
    sha256: 'e2e-png-sha256',
    mediaType: 'image/png',
    kind: 'image',
    byteLength: tinyPng.length,
    fileNames: ['pixel.png'],
    catalogIds: [catalogId],
    source: 'local',
    createdAt: at,
    bytes: tinyPng,
  };
}

export async function seedCatalog(page: Page, cards: SeedCard[], assets: SeedAsset[] = []): Promise<void> {
  const catalogId = 'e2e-catalog';
  const manifest = assets.map(asset => ({
    id: asset.id,
    fileName: asset.fileNames[0],
    mediaType: asset.mediaType,
    kind: asset.kind,
    byteLength: asset.byteLength,
    sha256: asset.sha256,
    source: asset.source,
    createdAt: asset.createdAt,
    altText: asset.kind === 'image' ? 'E2E Testbild' : undefined,
    rights: 'E2E fixture',
  }));
  const catalog = {
    catalogId,
    title: 'E2E Katalog',
    version: '1.0.0',
    createdAt: at,
    updatedAt: at,
    cards,
    assets: manifest,
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
    activeCatalogId: catalogId,
  };

  await page.goto('/');
  await page.evaluate(async ({ catalog, state, assets }) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('exam-trainer-framework');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB delete blocked'));
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework', 3);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('catalogs')) db.createObjectStore('catalogs', { keyPath: 'catalogId' });
        if (!db.objectStoreNames.contains('assets')) {
          const store = db.createObjectStore('assets', { keyPath: 'id' });
          store.createIndex('sha256', 'sha256', { unique: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['kv', 'catalogs', 'assets'], 'readwrite');
    tx.objectStore('kv').put(state, 'state');
    tx.objectStore('catalogs').put(catalog);
    for (const asset of assets) tx.objectStore('assets').put({ ...asset, bytes: new Uint8Array(asset.bytes) });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { catalog, state, assets });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'E2E Katalog' })).toBeVisible();
}

export async function readCatalogs(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('exam-trainer-framework', 3);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('catalogs', 'readonly');
    const catalogs = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const req = tx.objectStore('catalogs').getAll();
      req.onsuccess = () => resolve(req.result as Array<Record<string, unknown>>);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return catalogs;
  });
}

export async function startLearning(page: Page): Promise<void> {
  await page.locator('[data-view="learn"]').first().click();
  await page.locator('#mode').selectOption('all');
  await page.locator('[data-start-custom]').click();
  await expect(page.locator('.question-card')).toBeVisible();
}

export async function openCardEditor(page: Page, cardId: string): Promise<void> {
  await page.locator('[data-view="catalogs"]').first().click();
  await page.locator(`[data-edit-card="${cardId}"]`).click();
  await expect(page.locator('#card-form')).toBeVisible();
}

let sqlPromise: Promise<SqlJsStatic> | undefined;
async function sql(): Promise<SqlJsStatic> {
  return sqlPromise ??= initSqlJs() as Promise<SqlJsStatic>;
}

export async function makeLegacyApkg(): Promise<Buffer> {
  const SQL = await sql();
  const db: Database = new SQL.Database();
  db.run('CREATE TABLE col (ver integer, models text, decks text)');
  const models = JSON.stringify({
    100: {
      name: 'Basic',
      flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }],
      tmpls: [{ name: 'Card 1', ord: 0, qfmt: '{{Front}}', afmt: '{{Back}}' }],
    },
  });
  const decks = JSON.stringify({ 1: { name: 'E2E::Anki' } });
  db.run('INSERT INTO col VALUES (11, ?, ?)', [models, decks]);
  db.run('CREATE TABLE notes (id integer primary key, mid integer, flds text, tags text)');
  db.run('CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer)');
  db.run('INSERT INTO notes VALUES (1,100,?,?)', ['Anki E2E Frage\x1fAnki E2E Antwort', ' e2e ']);
  db.run('INSERT INTO cards VALUES (10,1,1,0)');
  const sqlite = db.export();
  db.close();
  const archive = zipSync({ 'collection.anki2': sqlite, media: strToU8('{}') });
  return Buffer.from(archive);
}
