import { expect, test, type Page } from '@playwright/test';
import { card, seedCatalog } from './helpers';

async function focusByTab(page: Page, selector: string, maxTabs = 60): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press('Tab');
    const matched = await page.evaluate(target => document.activeElement?.matches(target) ?? false, selector);
    if (matched) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector} within ${maxTabs} Tab presses`);
}

async function startLearningByKeyboard(page: Page): Promise<void> {
  await focusByTab(page, 'nav.bottom-nav [data-view="learn"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('#mode')).toBeVisible();
  await focusByTab(page, '[data-start-custom]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-recoverable-session]')).toBeVisible();
}

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

test('completes a learning item through keyboard focus and Enter without pointer input', async ({ page }) => {
  await seedCatalog(page, [card('free_text', { id: 'a11y-learning', prompt: 'Keyboard learning flow' })]);
  await page.setViewportSize({ width: 1280, height: 800 });

  await startLearningByKeyboard(page);
  await expect(page.locator('textarea#answer')).toBeVisible();

  await focusByTab(page, 'textarea#answer');
  await page.keyboard.type('Keyboard answer');
  await expect(page.locator('textarea#answer')).toHaveValue('Keyboard answer');

  await focusByTab(page, '[data-recoverable-reveal]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.answer-box')).toBeVisible();

  await focusByTab(page, '[data-recoverable-grade="correct"]');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-recoverable-session]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sitzung abgeschlossen' })).toBeVisible();

  await focusByTab(page, '[data-recoverable-home]');
  await page.keyboard.press('Enter');
  await expect(page.locator('nav.bottom-nav')).toBeVisible();
  await expect(page.locator('nav.bottom-nav [data-view="home"]')).toHaveClass(/active/);
});

test('selects a single-choice answer with keyboard focus and Space', async ({ page }) => {
  await seedCatalog(page, [card('single_choice', {
    id: 'a11y-single-choice',
    prompt: 'Keyboard single choice',
    answer: {
      modelAnswer: 'Antwort A',
      choices: [
        { id: 'a', text: 'Antwort A', correct: true },
        { id: 'b', text: 'Antwort B' },
      ],
    },
  })]);
  await page.setViewportSize({ width: 1280, height: 800 });

  await startLearningByKeyboard(page);
  const choice = page.locator('input[type="radio"][name="structured-choice"][value="a"]');
  await expect(choice).toBeVisible();
  await focusByTab(page, 'input[type="radio"][name="structured-choice"][value="a"]');
  await page.keyboard.press('Space');
  await expect(choice).toBeChecked();

  await focusByTab(page, '[data-recoverable-reveal]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.answer-box')).toBeVisible();
});

test('toggles multiple-choice answers with keyboard focus and Space', async ({ page }) => {
  await seedCatalog(page, [card('multiple_choice', {
    id: 'a11y-multiple-choice',
    prompt: 'Keyboard multiple choice',
    answer: {
      modelAnswer: 'Antwort A und C',
      choices: [
        { id: 'a', text: 'Antwort A', correct: true },
        { id: 'b', text: 'Antwort B' },
        { id: 'c', text: 'Antwort C', correct: true },
      ],
    },
  })]);
  await page.setViewportSize({ width: 1280, height: 800 });

  await startLearningByKeyboard(page);
  const first = page.locator('input[type="checkbox"][name="structured-choice"][value="a"]');
  const third = page.locator('input[type="checkbox"][name="structured-choice"][value="c"]');
  await expect(first).toBeVisible();
  await expect(third).toBeVisible();

  await focusByTab(page, 'input[type="checkbox"][name="structured-choice"][value="a"]');
  await page.keyboard.press('Space');
  await expect(first).toBeChecked();

  await focusByTab(page, 'input[type="checkbox"][name="structured-choice"][value="c"]');
  await page.keyboard.press('Space');
  await expect(third).toBeChecked();

  await focusByTab(page, '[data-recoverable-reveal]');
  await page.keyboard.press('Enter');
  await expect(page.locator('.answer-box')).toBeVisible();
});
