import { test, expect } from '@playwright/test';

test.describe('Wallet connect flow', () => {
  test('should open wallet drawer and list wallet options', async ({ page }) => {
    await page.goto('/');

    const connectWalletButton = page.getByRole('button', {
      name: 'Connect Wallet',
      exact: true,
    });
    await expect(connectWalletButton).toBeVisible({ timeout: 15_000 });
    await connectWalletButton.click();

    const connectYourWalletText = page.getByText('Connect your wallet', {
      exact: true,
    });
    await expect(connectYourWalletText).toBeVisible({ timeout: 10_000 });

    const freighterOption = page.getByText('Freighter', { exact: true });
    await expect(freighterOption).toBeVisible({ timeout: 10_000 });
  });
});
