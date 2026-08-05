import { expect, test } from '@playwright/test';

// Covers ADR-0008's routing contract end to end — the one seam Vitest/jsdom
// can't exercise, since it's the actual next-intl middleware (proxy.ts)
// doing the locale resolution and prefix rewriting. Uses /about rather than
// a data-backed page: it's static content, so this suite doesn't need the
// api or a seeded fixture to prove the routing/switcher behavior.
test.describe('locale routing', () => {
  test('an unprefixed URL serves English', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'About Travel Booking' })).toBeVisible();
  });

  test('the same page under /fr serves French with html lang="fr"', async ({ page }) => {
    await page.goto('/fr/about');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { name: 'À propos de Travel Booking' })).toBeVisible();
  });

  test('the switcher navigates to the current page in French, not the homepage', async ({
    page,
  }) => {
    await page.goto('/about');

    await page
      .getByRole('navigation', { name: 'Switch language' })
      .getByRole('link', { name: 'Français' })
      .click();

    await expect(page).toHaveURL(/\/fr\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.getByRole('heading', { name: 'À propos de Travel Booking' })).toBeVisible();
  });

  test('the switcher navigates back to the current page in English, not the homepage', async ({
    page,
  }) => {
    await page.goto('/fr/about');

    await page
      .getByRole('navigation', { name: 'Changer de langue' })
      .getByRole('link', { name: 'English' })
      .click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'About Travel Booking' })).toBeVisible();
  });

  test('a French visitor is not auto-redirected — the default locale stays English absent an explicit choice', async ({
    browser,
  }) => {
    // A fresh context with a French browser locale — ADR-0008 disables
    // next-intl's localeDetection, so this must not influence routing.
    const context = await browser.newContext({ locale: 'fr-FR' });
    const page = await context.newPage();

    await page.goto('/about');

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await context.close();
  });
});
