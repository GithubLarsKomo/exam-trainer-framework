import { expect, test } from '@playwright/test';
import { card, seedCatalog } from './helpers';
import { openSettings } from './navigation-helpers';

test('shows FSRS shadow evidence without enabling the scheduler', async ({ page }) => {
  await seedCatalog(page,[card('free_text',{id:'fsrs-shadow-card',prompt:'FSRS shadow evidence'})]);
  await openSettings(page);
  const panel=page.locator('[data-fsrs-shadow-evaluation]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('FSRS Shadow · ohne Einfluss auf den Lernplan');
  await expect(panel).toContainText('Datenerhebung läuft');
  await expect(panel).toContainText('400');
  await expect(page.locator('[data-start-today]')).toHaveCount(0);
});
