import { test, expect } from '@playwright/test';

test.describe('Add Liquidity', () => {
  test('navigates from pools page to create position flow', async ({ page }) => {
    await page.goto('/pools');
    await page
      .getByRole('button', { name: /add liquidity/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/positions\/create/);
    await expect(page.getByRole('heading', { name: /new position/i })).toBeVisible();
  });
});
