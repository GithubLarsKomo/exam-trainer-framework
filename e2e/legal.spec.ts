import { expect, test } from '@playwright/test';

test('exposes legal links from the public app shell', async ({ page }) => {
  await page.goto('/');

  const footer = page.getByRole('contentinfo', { name: 'Rechtliche Informationen' });
  await expect(footer).toBeVisible();
  await expect(footer.getByRole('link', { name: 'Impressum' })).toHaveAttribute('href', './impressum.html');
  await expect(footer.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute('href', './datenschutz.html');
});

test('serves the legal notice with an explicit operator completion warning', async ({ page }) => {
  await page.goto('/impressum.html');

  await expect(page.getByRole('heading', { name: 'Impressum' })).toBeVisible();
  await expect(page.getByText('Angaben gemäß § 5 DDG')).toBeVisible();
  await expect(page.getByText('[BETREIBERNAME / FIRMA EINTRAGEN]')).toBeVisible();
  await expect(page.getByRole('link', { name: '← Zur App' })).toHaveAttribute('href', './');
});

test('serves privacy information that matches the current local-first deployment model', async ({ page }) => {
  await page.goto('/datenschutz.html');

  await expect(page.getByRole('heading', { name: 'Datenschutzhinweise' })).toBeVisible();
  await expect(page.getByText('local-first PWA')).toBeVisible();
  await expect(page.getByText(/keine Werbetracker, kein externes Web-Analytics und keine Telemetrie/)).toBeVisible();
  await expect(page.getByText(/Hetzner Online GmbH/)).toBeVisible();
  await expect(page.getByText('[SERVER-/PROXY-LOG-AUFBEWAHRUNG EINTRAGEN]')).toBeVisible();
});
