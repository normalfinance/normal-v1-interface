import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders key sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /close/i }).click();

    await expect(
      page.getByRole('heading', { name: /Instant crypto swaps, finally made Normal/i })
    ).toBeVisible({
      timeout: 20000,
    });

    await expect(page.getByRole('heading', { name: /Customer testimonials/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /Trusted by thousands/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /Frequently asked questions/i })).toBeVisible();

    await expect(page.getByRole('heading', { name: /Crypto made normal/i })).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: /Ready to make your investing Normal\? Start investing, diversifying, and exploring./i,
      })
    ).toBeVisible();
  });

  test('allows user to switch language', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /close/i }).click();

    await expect(
      page.getByRole('heading', { name: /Instant crypto swaps, finally made Normal/i })
    ).toBeVisible({
      timeout: 20000,
    });

    await page.getByTestId('languages-button').click({ force: true });

    await page.waitForTimeout(500);

    await page.getByRole('menuitem', { name: /french/i }).click();

    await expect(
      page.getByRole('heading', {
        name: /Des échanges instantanés de cryptomonnaies, enfin réalisés Normale/i,
      })
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
