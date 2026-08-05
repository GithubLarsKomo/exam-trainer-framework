import { expect, test, type Locator } from '@playwright/test';
import { card, makeLegacyApkg, openCardEditor, readCatalogs, seedCatalog, startLearning } from './helpers';
import { openSettings } from './navigation-helpers';

async function swipe(target:Locator,direction:'left'|'right'):Promise<void>{
  await target.evaluate(async(element,direction)=>{
    const startX=direction==='left'?240:80;
    const endX=direction==='left'?80:240;
    element.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:41,pointerType:'touch',isPrimary:true,clientX:startX,clientY:120}));
    await new Promise(resolve=>setTimeout(resolve,30));
    element.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:41,pointerType:'touch',isPrimary:true,clientX:endX,clientY:125}));
  },direction);
}

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
  await expect(page.locator('[data-recoverable-resume-banner]')).toHaveCount(1);
  await expect(page.locator('[data-recoverable-resume]')).toHaveCount(1);
  await page.locator('[data-recoverable-resume]').click();
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
  await expect(page.locator('textarea#answer')).toHaveValue('persistierte Browserantwort');
});

test('keeps touch gestures opt-in, ignores answer controls and retains button fallback', async ({ page }) => {
  await seedCatalog(page,[
    card('free_text',{id:'gesture-a',prompt:'Gesture A'}),
    card('free_text',{id:'gesture-b',prompt:'Gesture B'}),
  ]);
  await openSettings(page);
  const toggle=page.locator('[data-touch-gestures-toggle]');
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.locator('[data-view="learn"]:visible').first().click();
  await page.locator('#mode').selectOption('all');
  await page.locator('[data-start-custom]').click();
  await expect(page.locator('[data-recoverable-session][data-touch-gestures-active]')).toBeVisible();
  await expect(page.locator('[data-recoverable-skip]')).toBeVisible();
  await expect(page.locator('[data-recoverable-reveal]')).toBeVisible();

  const prompt=page.locator('.question-card h2');
  const firstPrompt=await prompt.textContent();
  const answer=page.locator('.question-card textarea#answer');
  await answer.fill('touch input remains protected');
  await swipe(answer,'left');
  await expect(prompt).toHaveText(firstPrompt??'');

  await swipe(prompt,'left');
  await expect(prompt).not.toHaveText(firstPrompt??'');
  await expect(page.locator('[data-recoverable-skip]')).toBeVisible();
});

test('uses touch swipes only as exam navigation aliases', async ({ page }) => {
  await seedCatalog(page,[
    card('free_text',{id:'swipe-exam-a',prompt:'Swipe exam A'}),
    card('free_text',{id:'swipe-exam-b',prompt:'Swipe exam B'}),
    card('free_text',{id:'swipe-exam-c',prompt:'Swipe exam C'}),
  ]);
  await page.evaluate(()=>localStorage.setItem('etf:touch-gestures:v1','1'));
  await page.locator('[data-view="exam"]:visible').first().click();
  await page.locator('#exam-mode').selectOption('fixed');
  await page.locator('[data-exam]').click();
  await expect(page.locator('[data-recoverable-exam-nav="0"]')).toHaveClass(/current/);
  await swipe(page.locator('.question-card h2'),'left');
  await expect(page.locator('[data-recoverable-exam-nav="1"]')).toHaveClass(/current/);
  await swipe(page.locator('.question-card h2'),'right');
  await expect(page.locator('[data-recoverable-exam-nav="0"]')).toHaveClass(/current/);
  await expect(page.locator('[data-recoverable-prev]')).toBeVisible();
  await expect(page.locator('[data-recoverable-next]')).toBeVisible();
});

test('provides non-linear examination navigation without committing reviews early', async ({ page }) => {
  await seedCatalog(page,[
    card('free_text',{id:'exam-a',prompt:'Prüfungsfrage A'}),
    card('free_text',{id:'exam-b',prompt:'Prüfungsfrage B'}),
    card('free_text',{id:'exam-c',prompt:'Prüfungsfrage C'}),
  ]);
  await page.locator('[data-view="exam"]:visible').first().click();
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

test('keeps dependent examination subtasks together and unlocks them in order', async ({ page }) => {
  await seedCatalog(page,[
    card('free_text',{id:'dep-a1',prompt:'Teilaufgabe 1',examGroupId:'case-7',examGroupOrder:1}),
    card('free_text',{id:'dep-a2',prompt:'Teilaufgabe 2',examGroupId:'case-7',examGroupOrder:2}),
    card('free_text',{id:'dep-b',prompt:'Unabhängige Aufgabe'}),
  ]);
  await page.evaluate(()=>localStorage.setItem('etf:touch-gestures:v1','1'));
  await page.locator('[data-view="exam"]:visible').first().click();
  await page.locator('#exam-mode').selectOption('fixed');
  await page.locator('[data-exam]').click();
  await expect(page.locator('[data-recoverable-exam-nav]')).toHaveCount(3);
  const lockedNav=page.locator('[data-recoverable-exam-nav][data-dependent-exam-locked]');
  await expect(lockedNav).toHaveCount(1);

  const lockedIndex=Number(await lockedNav.first().getAttribute('data-recoverable-exam-nav'));
  expect(lockedIndex).toBeGreaterThan(0);
  await page.locator(`[data-recoverable-exam-nav="${lockedIndex-1}"]`).click();
  await expect(page.locator('[data-dependent-exam-context]')).toContainText('Teilaufgabe 1 von 2');
  await swipe(page.locator('.question-card h2'),'left');
  await expect(page.locator(`[data-recoverable-exam-nav="${lockedIndex-1}"]`)).toHaveClass(/current/);
  await page.locator('[data-recoverable-reveal]').click();
  await page.locator('[data-recoverable-grade="correct"]').click();
  await expect(page.locator('[data-recoverable-exam-nav][data-dependent-exam-locked]')).toHaveCount(0);
  await expect(page.locator('[data-dependent-exam-context]')).toContainText('Teilaufgabe 2 von 2');
});

test('editing a released card creates a draft successor and keeps the release immutable', async ({ page }) => {
  const released=card('free_text',{id:'e2e-publish',prompt:'Unveränderter Release'});
  await seedCatalog(page,[released]);
  await openCardEditor(page,released.id);
  await page.locator('textarea[name="prompt"]').fill('Bearbeiteter Entwurf');
  await expect(page.locator('input[name="editorExamGroupId"]')).toBeVisible();
  await page.locator('input[name="editorExamGroupId"]').fill('case-9');
  await page.locator('input[name="editorExamGroupOrder"]').fill('1');
  page.once('dialog',dialog=>dialog.accept());
  const reloaded=page.waitForEvent('framenavigated',frame=>frame===page.mainFrame());
  await page.locator('[data-save-card]').click();
  await reloaded;
  await expect(page.locator('.app-header h1')).toHaveText('E2E Katalog');

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
  expect(draft).toMatchObject({status:'draft',prompt:'Bearbeiteter Entwurf',parentId:'e2e-publish',examGroupId:'case-9',examGroupOrder:1});
});

test('imports a real legacy APKG through mapping, preview and explicit commit', async ({ page }) => {
  await seedCatalog(page,[card('free_text',{id:'base-card',prompt:'Basisfrage'})]);
  await openSettings(page);
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
