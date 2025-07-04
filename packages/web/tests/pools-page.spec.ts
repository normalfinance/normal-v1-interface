import { test, expect } from '@playwright/test';

test.describe('Pools page', () => {
  test('renders pools list and navigates to pool details', async ({ page }) => {
    await page.goto('/pools');

    await expect(page.getByRole('heading', { name: /pools/i })).toBeVisible();

    const poolItem = page.getByText(/-/).first();
    await expect(poolItem).toBeVisible();

    await poolItem.click();

    await expect(page).toHaveURL(/\/pools\//);

    await expect(page.getByText('Swap', { exact: true })).toBeVisible();
    await expect(page.getByText('Add Liquidity', { exact: false })).toBeVisible();
    await expect(page.getByText('Total APR', { exact: true })).toBeVisible();
  });
});
