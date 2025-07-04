import { test, expect } from '@playwright/test';

// NOTE: The dev server will be started automatically via playwright.config.ts

test.describe('Home page', () => {
  test('renders key sections', async ({ page }) => {
    await page.goto('/');

    // Wait for Next.js hydration and heading to appear (allow up to 15s)
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    // Portfolio chart selector button (default 24h) should be visible
    await expect(page.getByRole('button', { name: /^24h$/ })).toBeVisible({ timeout: 15_000 });
  });

  test('allows user to switch portfolio timeframe', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByText('24h', { exact: true });

    console.log('selectorButton', selectorButton);
    await selectorButton.waitFor({ state: 'visible', timeout: 20_000 });

    // Open the dropdown
    await selectorButton.click();

    // Wait for menu item then click
    const menuOption = page.getByText('7d', { exact: true });
    console.log('menuOption', menuOption);
    await menuOption.waitFor({ state: 'visible', timeout: 10_000 });
    await menuOption.click();

    // Button text should now reflect the new selection
    await expect(page.getByRole('button', { name: /^7d$/ })).toBeVisible({ timeout: 10_000 });
  });
});
