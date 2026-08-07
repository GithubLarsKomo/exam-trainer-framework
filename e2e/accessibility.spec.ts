import { expect, test } from '@playwright/test';
import { card, seedCatalog } from './helpers';

test('keeps primary navigation keyboard reachable with a visible focus indicator', async ({ page }) => {
  await seedCatalog(page, [card('free_text', { id: 'a11y-keyboard', prompt: 'Keyboard accessibility' })]);
  await page.setViewportSize({ width: 1280, height: 800 });

  const nav = page.locator('nav.bottom-nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('button:visible')).toHaveCount(6);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

  let focusedView: string | null = null;
  for (let index = 0; index < 30 && !focusedView; index += 1) {
    await page.keyboard.press('Tab');
    focusedView = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      return element?.closest('nav.bottom-nav') ? element.dataset.view ?? null : null;
    });
  }
  expect(focusedView).not.toBeNull();

  const focusIndicatorVisible = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return false;
    const style = getComputedStyle(element);
    const outlined = style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
    const shadowed = style.boxShadow !== 'none';
    return outlined || shadowed;
  });
  expect(focusIndicatorVisible).toBe(true);

  for (const view of ['home', 'learn', 'exam', 'progress', 'catalogs', 'settings']) {
    const target = page.locator(`nav.bottom-nav [data-view="${view}"]:visible`);
    await target.focus();
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(`nav.bottom-nav [data-view="${view}"]:visible`)).toHaveClass(/active/);
  }
});
