import { test, expect } from '@playwright/test';

test.describe('Change language', () => {
  test('should change language', async ({ page }) => {
    await page.goto('/');

    const langButton = page.getByTestId('languages-button');
    await expect(langButton).toBeVisible({ timeout: 15_000 });
    await langButton.click();

    const frenchOption = page.getByText('French', { exact: true });
    await expect(frenchOption).toBeVisible({ timeout: 10_000 });
    await frenchOption.click();

    const frenchWelcome = page.getByText('Bienvenue 👋');
    await expect(frenchWelcome).toBeVisible({ timeout: 10_000 });
  });
});
