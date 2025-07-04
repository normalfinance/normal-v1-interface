import { test, expect } from '@playwright/test';

test.describe('Insurance Fund Staking', () => {
  test('deposit and withdraw actions trigger dialogs', async ({ page }) => {
    await page.goto('/insurance');
    const handleDialog = async () => {
      page.once('dialog', async (dialog) => {
        await dialog.accept();
      });
    };
    await handleDialog();
    await page.getByRole('button', { name: /deposit/i }).click();
    await handleDialog();
    await page.getByRole('button', { name: /withdraw/i }).click();
    await expect(page.getByRole('heading', { name: /insurance/i })).toBeVisible();
  });
});
