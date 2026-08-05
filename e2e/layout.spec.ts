import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, seedCatalog, startLearning } from './helpers';

async function expectNoHorizontalPageOverflow(page:Page):Promise<void>{
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}

async function expectTouchTargets(targets:Locator):Promise<void>{
  const undersized=await targets.evaluateAll(elements=>elements.filter(element=>{
    const rect=element.getBoundingClientRect();
    return rect.width<44||rect.height<44;
  }).map(element=>({label:element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  expect(undersized).toEqual([]);
}

test('keeps core product views inside a 320px viewport with five usable primary mobile targets',async({page})=>{
  await seedCatalog(page,[
    card('free_text',{id:'layout-a',prompt:'Layout A'}),
    card('single_choice',{id:'layout-b',prompt:'Layout B',answer:{modelAnswer:'A',choices:[{id:'a',text:'A',correct:true},{id:'b',text:'B'}]}}),
  ]);
  await page.setViewportSize({width:320,height:800});

  const primary=page.locator('nav.bottom-nav button:visible');
  await expect(primary).toHaveCount(5);

  for(const view of ['home','learn','exam','progress','catalogs']){
    await page.locator(`nav.bottom-nav [data-view="${view}"]:visible`).click();
    await expectNoHorizontalPageOverflow(page);
    await expectTouchTargets(primary);
  }

  const settingsShortcut=page.locator('[data-mobile-settings-shortcut]:visible');
  await expect(settingsShortcut).toHaveCount(1);
  await expectTouchTargets(settingsShortcut);
  await settingsShortcut.click();
  await expect(page.getByRole('heading',{name:'Daten und Sicherung'})).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expectTouchTargets(primary);

  await page.locator('nav.bottom-nav [data-view="learn"]:visible').click();
  await startLearning(page);
  await expect(page.locator('.question-card')).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expect(page.locator('[data-recoverable-reveal]')).toBeVisible();
});
