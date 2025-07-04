import { test, expect } from '@playwright/test';

test.describe('Account Drawer', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem(
        'app-storage',
        '{"state":{"wallet":{"address":"GTESTADDRESS123","activeChain":null,"server":null,"walletType":"freighter"},"disclaimer":{"accepted":true}},"version":0}'
      );
    });
  });

  test('displays balances positions and history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /account button/i }).click();
    await expect(page.getByText('Tokens')).toBeVisible();
    await expect(page.getByText('Ethereum')).toBeVisible();
    await expect(page.getByText('USDC')).toBeVisible();
    await page.getByRole('tab', { name: /pools/i }).click();
    await expect(page.getByText(/position/i)).toBeVisible();
    await page.getByRole('tab', { name: /activity/i }).click();
    await expect(page.getByText(/add liquidity/i)).toBeVisible();
    await expect(page.getByText(/remove liquidity/i)).toBeVisible();
  });
});
