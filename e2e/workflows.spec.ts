import { expect, test } from '@playwright/test';
import { card, makeLegacyApkg, openCardEditor, readCatalogs, seedCatalog, startLearning } from './helpers';

test('restores an interrupted learning session including the answer draft', async ({ page }) => {
  await seedCatalog(page,[card('free_text',{id:'e2e-recovery',prompt:'Recovery question'})]);
  await startLearning(page);
  await page.locator('textarea#answer').fill('persistierte Browserantwort');
  await expect.poll(async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('exam-trainer-framework',3);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const value=await new Promise<Record<string,unknown>>((resolve,reject)=>{const req=db.transaction('kv','readonly').objectStore('kv').get('state');req.onsuccess=()=>resolve(req.result as Record<string,unknown>);req.onerror=()=>reject(req.error);});
    db.close();
    return JSON.stringify(value.sessions??{}).includes('persistierte Browserantwort');
  })).toBe(true);

  await page.reload();
  await expect(page.locator('[data-recoverable-resume-banner]')).toBeVisible();
  await page.locator('[data-recoverable-resume]').click();
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
  await expect(page.locator('textarea#answer')).toHaveValue('persistierte Browserantwort');
});

test('provides non-linear examination navigation without committing reviews early', async ({ page }) => {
  await seedCatalog(page,[
    card('free_text',{id:'exam-a',prompt:'Prüfungsfrage A'}),
    card('free_text',{id:'exam-b',prompt:'Prüfungsfrage B'}),
    card('free_text',{id:'exam-c',prompt:'Prüfungsfrage C'}),
  ]);
  await page.locator('[data-view="exam"]').first().click();
  await expect(page.locator('#exam-mode')).toBeVisible();
  await page.locator('#exam-mode').selectOption('fixed');
  await page.locator('[data-exam]').click();
  await expect(page.locator('[data-recoverable-exam-nav]')).toHaveCount(3);
  await page.locator('[data-recoverable-exam-nav="1"]').click();
  await expect(page.locator('[data-recoverable-exam-nav="1"]')).toHaveClass(/current/);
  await expect.poll(async()=>page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('exam-trainer-framework',3);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const value=await new Promise<{reviewEvents?:unknown[]}>((resolve,reject)=>{const req=db.transaction('kv','readonly').objectStore('kv').get('state');req.onsuccess=()=>resolve(req.result as {reviewEvents?:unknown[]});req.onerror=()=>reject(req.error);});db.close();return value.reviewEvents?.length??0;
  })).toBe(0);
});

test('editing a released card creates a draft successor and keeps the release immutable', async ({ page }) => {
  const released=card('free_text',{id:'e2e-publish',prompt:'Unveränderter Release'});
  await seedCatalog(page,[released]);
  await openCardEditor(page,released.id);
  await page.locator('textarea[name="prompt"]').fill('Bearbeiteter Entwurf');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('[data-save-card]').click();

  await expect.poll(async()=>{
    const catalogs=await readCatalogs(page);
    const catalog=catalogs.find(entry=>entry.catalogId==='e2e-catalog') as {cards?:Array<Record<string,unknown>>}|undefined;
    return catalog?.cards?.some(entry=>entry.parentId==='e2e-publish'&&entry.status==='draft'&&entry.prompt==='Bearbeiteter Entwurf')??false;
  }).toBe(true);
  const catalogs=await readCatalogs(page);
  const catalog=catalogs.find(entry=>entry.catalogId==='e2e-catalog') as {cards:Array<Record<string,unknown>>};
  const original=catalog.cards.find(entry=>entry.id==='e2e-publish');
  const draft=catalog.cards.find(entry=>entry.parentId==='e2e-publish'&&entry.status==='draft');
  expect(original).toMatchObject({id:'e2e-publish',status:'released',prompt:'Unveränderter Release'});
  expect(draft).toMatchObject({status:'draft',prompt:'Bearbeiteter Entwurf',parentId:'e2e-publish'});
});

test('imports a real legacy APKG through mapping, preview and explicit commit', async ({ page }) => {
  await seedCatalog(page,[card('free_text',{id:'base-card',prompt:'Basisfrage'})]);
  await page.locator('[data-view="settings"]').first().click();
  await page.locator('[data-open-content-import]').click();
  const apkg=await makeLegacyApkg();
  await page.locator('#content-import-file').setInputFiles({name:'e2e-anki.apkg',mimeType:'application/octet-stream',buffer:apkg});
  await expect(page.getByText(/1 importierbare Wissenseinheiten/)).toBeVisible();
  await expect(page.getByText('Anki E2E Frage')).toBeVisible();
  await page.locator('#import-status').selectOption('draft');
  await page.locator('[data-import-commit]').click();
  await expect(page.getByRole('heading',{name:'Import übernommen'})).toBeVisible();
  const catalogs=await readCatalogs(page);
  const imported=catalogs.find(entry=>entry.title==='e2e-anki') as {cards?:Array<Record<string,unknown>>}|undefined;
  expect(imported?.cards).toHaveLength(1);
  expect(imported?.cards?.[0]).toMatchObject({prompt:'Anki E2E Frage',status:'draft'});
});
