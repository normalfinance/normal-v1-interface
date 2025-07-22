import { test, expect } from '@playwright/test';

test.describe('TokenActionCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/swap');
    await page.waitForURL('**/swap{/}');
    await page.waitForLoadState('networkidle');

    const closeButton = page.getByRole('button', { name: /close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    await expect(page.locator('.react-loading-skeleton')).not.toBeVisible({ timeout: 20000 });
  });

  test('renders the component and defaults to the swap tab', async ({ page }) => {
    await expect(page.getByTestId('token-action-card')).toBeVisible();
    await expect(page.getByTestId('swap-tab')).toBeVisible();
    await expect(page.getByTestId('send-tab')).toBeVisible();
    await expect(page.getByTestId('buy-tab')).toBeVisible();

    await expect(page.getByTestId('swap-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('swap-card')).toBeVisible();
  });

  test('allows switching between tabs', async ({ page }) => {
    await page.getByTestId('send-tab').click();
    await expect(page.getByTestId('send-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText("You're sending")).toBeVisible();

    await page.getByTestId('buy-tab').click();
    await expect(page.getByTestId('buy-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText("You're buying")).toBeVisible();

    await page.getByTestId('swap-tab').click();
    await expect(page.getByTestId('swap-tab')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('swap-card')).toBeVisible();
  });
});
