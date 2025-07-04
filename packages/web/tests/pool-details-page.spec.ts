import { test, expect } from '@playwright/test';

test.describe('Pool details page', () => {
  test('renders pool stats and allows add/remove liquidity', async ({ page }) => {
    const poolAddress = 'test-pool-address';
    await page.goto(`/pools/${poolAddress}`);

    await expect(page.getByRole('heading', { name: /pool/i })).toBeVisible();

    await expect(page.locator('img[alt]')).toHaveCount(2);

    await expect(page.getByText(/pool liquidity/i)).toBeVisible();

    await expect(page.getByRole('button', { name: /add liquidity/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    const addInput = page.locator('input[type="text"]').first();
    await addInput.fill('1');
    await page.getByRole('button', { name: /add liquidity/i }).click();

    await expect(page.getByText(/success|added|completed/i)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /remove liquidity/i }).click();
    const removeInput = page.locator('input[type="text"]').first();
    await removeInput.fill('1');
    await page.getByRole('button', { name: /remove liquidity/i }).click();

    await expect(page.getByText(/success|removed|completed/i)).toBeVisible({ timeout: 15000 });
  });
});
