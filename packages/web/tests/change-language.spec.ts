import { test, expect } from '@playwright/test';

test.describe('Change language', () => {
  test('should change language', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('languages-button').click();
    await page.getByText('Korean').click();

    await expect(page.getByText('Korean')).toBeVisible();
  });
});
