import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('renders key sections', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole('button', { name: /^24h$/ })).toBeVisible({ timeout: 15_000 });
  });

  test('allows user to switch portfolio timeframe', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByText('24h', { exact: true });

    console.log('selectorButton', selectorButton);
    await selectorButton.waitFor({ state: 'visible', timeout: 20_000 });

    await selectorButton.click();

    const menuOption = page.getByText('7d', { exact: true });
    console.log('menuOption', menuOption);
    await menuOption.waitFor({ state: 'visible', timeout: 10_000 });
    await menuOption.click();

    await expect(page.getByRole('button', { name: /^7d$/ })).toBeVisible({ timeout: 10_000 });
  });
});
