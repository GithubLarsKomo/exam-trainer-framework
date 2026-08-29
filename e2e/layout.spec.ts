import { expect, test, type Locator, type Page } from '@playwright/test';
import { card, seedCatalog, startLearning } from './helpers';

async function expectNoHorizontalPageOverflow(page:Page):Promise<void>{
  const overflow=await page.evaluate(()=>{
    const viewport=window.innerWidth;
    const elements=Array.from(document.querySelectorAll<HTMLElement>('body *'));
    return elements.flatMap(element=>{
      const style=getComputedStyle(element);
      const rect=element.getBoundingClientRect();
      if(style.display==='none'||style.visibility==='hidden'||rect.width===0||rect.height===0)return[];
      if(rect.left>=-1&&rect.right<=viewport+1)return[];
      return [{
        tag:element.tagName.toLowerCase(),
        className:element.className,
        text:(element.textContent??'').trim().replace(/\s+/g,' ').slice(0,120),
        left:Math.round(rect.left*10)/10,
        right:Math.round(rect.right*10)/10,
        width:Math.round(rect.width*10)/10,
        viewport,
        documentWidth:document.documentElement.scrollWidth,
      }];
    }).slice(0,20);
  });
  expect(overflow).toEqual([]);
}

async function expectTouchTargets(targets:Locator):Promise<void>{
  const undersized=await targets.evaluateAll(elements=>elements.filter(element=>{
    const rect=element.getBoundingClientRect();
    return rect.width<44||rect.height<44;
  }).map(element=>({label:element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  expect(undersized).toEqual([]);
}

async function expectLoadedMark(image:Locator):Promise<void>{
  await expect(image).toBeVisible();
  const loaded=await image.evaluate((element:HTMLImageElement)=>({
    src:element.getAttribute('src'),
    complete:element.complete,
    naturalWidth:element.naturalWidth,
    naturalHeight:element.naturalHeight,
    width:element.getBoundingClientRect().width,
    height:element.getBoundingClientRect().height,
  }));
  expect(loaded.src).toBe('/assets/etf-mark.svg');
  expect(loaded.complete).toBe(true);
  expect(loaded.naturalWidth).toBeGreaterThan(0);
  expect(loaded.naturalHeight).toBeGreaterThan(0);
  expect(loaded.width).toBeGreaterThanOrEqual(36);
  expect(loaded.height).toBeGreaterThanOrEqual(36);
}

test('uses rail branding and complete navigation on desktop',async({page})=>{
  await seedCatalog(page,[card('free_text',{id:'brand-a',prompt:'Branding'})]);
  await page.setViewportSize({width:1440,height:900});

  const headerBrand=page.locator('.app-brand-lockup');
  const railBrand=page.locator('.rail-brand');
  await expect(headerBrand).toBeHidden();
  await expect(railBrand).toBeVisible();
  await expect(railBrand).toContainText('Exam Trainer');
  await expect(railBrand).toContainText('Framework');
  await expectLoadedMark(railBrand.locator('img'));
  await expect(page.locator('.bottom-nav [data-view="settings"]')).toBeVisible();
  await expect(page.locator('.app-header h1')).toHaveText('E2E Katalog');
});

test('keeps core product views inside a 320px viewport with five usable primary mobile targets',async({page})=>{
  await seedCatalog(page,[
    card('free_text',{id:'layout-a',prompt:'Layout A'}),
    card('single_choice',{id:'layout-b',prompt:'Layout B',answer:{modelAnswer:'A',choices:[{id:'a',text:'A',correct:true},{id:'b',text:'B'}]}}),
  ]);
  await page.setViewportSize({width:320,height:800});

  const headerBrand=page.locator('.app-brand-lockup');
  await expect(headerBrand).toBeVisible();
  await expectLoadedMark(headerBrand.locator('img'));
  await expect(page.locator('.rail-brand')).toBeHidden();

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

  await page.locator('nav.bottom-nav [data-view="home"]:visible').click();
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const legalClearance=await page.evaluate(()=>{
    const nav=document.querySelector<HTMLElement>('nav.bottom-nav');
    const links=Array.from(document.querySelectorAll<HTMLElement>('.legal-footer a'));
    if(!nav||links.length===0)return null;
    const navTop=nav.getBoundingClientRect().top;
    const linkBottom=Math.max(...links.map(link=>link.getBoundingClientRect().bottom));
    return {navTop,linkBottom};
  });
  expect(legalClearance).not.toBeNull();
  expect(legalClearance!.linkBottom).toBeLessThanOrEqual(legalClearance!.navTop-8);

  await page.locator('nav.bottom-nav [data-view="learn"]:visible').click();
  await startLearning(page);
  await expect(page.locator('.question-card')).toBeVisible();
  await expectNoHorizontalPageOverflow(page);
  await expect(page.locator('[data-recoverable-reveal]')).toBeVisible();
});
