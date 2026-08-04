import { expect, test } from '@playwright/test';
import { card, imageAsset, seedCatalog, startLearning, type SeedCard } from './helpers';

type RendererCase = {
  name: string;
  card: SeedCard;
  prepare?: (page: import('@playwright/test').Page) => Promise<void>;
  visible: (page: import('@playwright/test').Page) => ReturnType<import('@playwright/test').Page['locator']>;
  assets?: ReturnType<typeof imageAsset>[];
};

const cases: RendererCase[] = [
  {
    name: 'free text',
    card: card('free_text'),
    visible: page => page.locator('textarea#answer'),
    prepare: async page => { await page.locator('textarea#answer').fill('Eigene Antwort'); },
  },
  {
    name: 'numeric',
    card: card('numeric', { answer: { modelAnswer: '42', value: 42, tolerance: { type: 'absolute', value: 0.5 } } }),
    visible: page => page.locator('textarea#answer'),
    prepare: async page => { await page.locator('textarea#answer').fill('42'); },
  },
  {
    name: 'single choice',
    card: card('single_choice', { answer: { modelAnswer: 'A', choices: [{ id:'a', text:'Antwort A', correct:true }, { id:'b', text:'Antwort B' }] } }),
    visible: page => page.locator('input[type="radio"][name="structured-choice"]'),
    prepare: async page => { await page.locator('input[type="radio"][value="a"]').check(); },
  },
  {
    name: 'multiple choice',
    card: card('multiple_choice', { answer: { modelAnswer: 'A und C', choices: [{ id:'a', text:'Antwort A', correct:true }, { id:'b', text:'Antwort B' }, { id:'c', text:'Antwort C', correct:true }] } }),
    visible: page => page.locator('input[type="checkbox"][name="structured-choice"]'),
    prepare: async page => { await page.locator('input[type="checkbox"][value="a"]').check(); await page.locator('input[type="checkbox"][value="c"]').check(); },
  },
  {
    name: 'cloze',
    card: card('cloze', { prompt:'ATP entsteht in der [[b1]].', answer:{ modelAnswer:'ATP entsteht in der Mitochondrie.', clozeBlanks:[{id:'b1',answer:'Mitochondrie'}] } }),
    visible: page => page.locator('[data-cloze-answer="b1"]'),
    prepare: async page => { await page.locator('[data-cloze-answer="b1"]').fill('Mitochondrie'); },
  },
  {
    name: 'matching',
    card: card('matching', { answer:{ modelAnswer:'Zuordnung', matchingPairs:[{id:'p1',left:'A',right:'1'},{id:'p2',left:'B',right:'2'}] } }),
    visible: page => page.locator('[data-match-answer]'),
    prepare: async page => { await page.locator('[data-match-answer="p1"]').selectOption('p1'); },
  },
  {
    name: 'ordering',
    card: card('ordering', { answer:{ modelAnswer:'1, 2, 3', orderingItems:[{id:'o1',text:'Erster Schritt'},{id:'o2',text:'Zweiter Schritt'},{id:'o3',text:'Dritter Schritt'}] } }),
    visible: page => page.locator('[data-order-up],[data-order-down]'),
    prepare: async page => { const move=page.locator('[data-order-down]:not([disabled])').first(); if(await move.count()) await move.click(); },
  },
  {
    name: 'drawing',
    card: card('drawing', { answer:{ modelAnswer:'Skizze', criteria:['Achsen beschriftet','Verlauf korrekt'] } }),
    visible: page => page.locator('.drawing-hint'),
  },
  {
    name: 'case study',
    card: card('case_study', { prompt:'Fallbeschreibung E2E', answer:{ modelAnswer:'Gesamtlösung', caseStudyParts:[{id:'c1',prompt:'Was ist zu tun?',modelAnswer:'Maßnahme A'}] } }),
    visible: page => page.locator('[data-case-answer="c1"]'),
    prepare: async page => { await page.locator('[data-case-answer="c1"]').fill('Maßnahme A'); },
  },
  {
    name: 'image labels',
    card: card('image_labels', {
      answer:{ modelAnswer:'Beschriftung', imageLabels:[{id:'h1',label:'Zentrum',x:0.5,y:0.5}] },
      assetRefs:[{assetId:'asset-e2e-png',role:'prompt',sourceFileName:'pixel.png',altText:'E2E Testbild'}],
    }),
    assets:[imageAsset()],
    visible: page => page.locator('[data-image-label-answer="h1"]'),
    prepare: async page => { await page.locator('[data-image-label-answer="h1"]').fill('Zentrum'); },
  },
];

for (const item of cases) {
  test(`renders and reveals ${item.name}`, async ({ page }) => {
    await seedCatalog(page, [item.card], item.assets ?? []);
    await startLearning(page);
    await expect(item.visible(page)).toBeVisible();
    await item.prepare?.(page);
    await page.locator('[data-recoverable-reveal], [data-reveal]').first().click();
    await expect(page.locator('.answer-box')).toBeVisible();
  });
}

test('renders prompt and answer assets only in their allowed phase', async ({ page }) => {
  const asset = imageAsset();
  const mediaCard = card('free_text', {
    id:'e2e-assets',
    prompt:'Asset visibility',
    assetRefs:[
      {assetId:asset.id,role:'prompt',sourceFileName:'pixel.png',altText:'Prompt E2E'},
      {assetId:asset.id,role:'answer',sourceFileName:'pixel.png',altText:'Answer E2E'},
    ],
  });
  await seedCatalog(page,[mediaCard],[asset]);
  await startLearning(page);
  await expect(page.locator('.question-card figure')).toHaveCount(1);
  await page.locator('[data-recoverable-reveal], [data-reveal]').first().click();
  await expect(page.locator('.question-card figure')).toHaveCount(2);
});
