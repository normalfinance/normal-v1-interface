import { test, expect } from '@playwright/test';

test.describe('Remove Liquidity', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'app-storage',
        '{"state":{"wallet":{"address":"GTESTADDRESS123","activeChain":null,"server":null,"walletType":"freighter"},"disclaimer":{"accepted":true}},"version":0}'
      );
    });
  });

  test('shows Remove Liquidity in activity', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /account button/i }).click();
    await page.getByRole('tab', { name: /activity/i }).click();
    await expect(page.getByText(/remove liquidity/i)).toBeVisible();
  });
});
