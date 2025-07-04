import { test, expect } from '@playwright/test';

test.describe('Swap page', () => {
  test('renders swap UI and allows full swap flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Swap', { exact: false })).toBeVisible();

    await expect(page.getByTestId('sell-token-picker')).toBeVisible();
    await expect(page.getByTestId('buy-token-picker')).toBeVisible();

    await page
      .getByRole('button', { name: /select token/i })
      .first()
      .click();
    await page.getByRole('option').first().click();

    await page
      .getByRole('button', { name: /select token/i })
      .nth(1)
      .click();
    await page.getByRole('option').nth(1).click();

    const sellInput = page.locator('input[type="number"]').first();
    await sellInput.fill('1');

    await page.getByRole('button', { name: /max/i }).click();

    await page.locator('button[aria-label="invert tokens"]').click();

    await expect(page.getByText(/review/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /review/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|swap/i }).click();

    await expect(page.getByText(/success|swapped|completed/i)).toBeVisible({ timeout: 15000 });
  });
});
