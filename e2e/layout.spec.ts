import { expect, test, type Page } from '@playwright/test';
import { card, seedCatalog, startLearning } from './helpers';

async function expectNoHorizontalPageOverflow(page:Page):Promise<void>{
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}

async function expectTouchTargets(page:Page):Promise<void>{
  const undersized=await page.locator('nav.bottom-nav button:visible').evaluateAll(buttons=>buttons.filter(button=>{
    const rect=button.getBoundingClientRect();
    return rect.width<44||rect.height<44;
  }).length);
  expect(undersized).toBe(0);
}

test('keeps core product views inside a 320px viewport with usable primary touch targets',async({page})=>{
  await seedCatalog(page,[
    card('free_text',{id:'layout-a',prompt:'Layout A'}),
    card('single_choice',{id:'layout-b',prompt:'Layout B',answer:{modelAnswer:'A',choices:[{id:'a',text:'A',correct:true},{id:'b',text:'B'}]}}),
  ]);
  await page.setViewportSize({width:320,height:800});

  for(const view of ['home','learn','exam','progress','catalogs','settings']){
    const target=page.locator(`nav.bottom-nav [data-view="${view}"]`);
    if(await target.count())await target.click();
    await expectNoHorizontalPageOverflow(page);
    await expectTouchTargets(page);
  }

  await startLearning(page);
  await expect(page.locator('.question-card')).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expect(page.locator('[data-recoverable-reveal]')).toBeVisible();
});
