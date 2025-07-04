import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Create index flow', () => {
  test('should allow user to create an index and reach confirmation dialog', async ({ page }) => {
    await page.goto('/create-an-index');

    await expect(page.getByRole('heading', { name: 'Create a Crypto Index' })).toBeVisible({
      timeout: 15_000,
    });

    const avatarInput = page.locator('input[type="file"]');
    const avatarPath = path.resolve(__dirname, '../public/favicon/android-chrome-192x192.png');
    await avatarInput.setInputFiles(avatarPath);

    await page.getByLabel('Index Name').fill('My Test Index');
    await page.getByLabel('Index Symbol').fill('MTI');
    await page.getByLabel('Description').fill('Playwright automated test index.');

    const addCoinButton = page.getByRole('button', { name: 'Add Coin' });
    await expect(addCoinButton).toBeVisible({ timeout: 10_000 });
    await addCoinButton.click();

    const selectTokenHeader = page.getByText('Select a token', { exact: true });
    await expect(selectTokenHeader).toBeVisible({ timeout: 10_000 });

    const bitcoinOption = page.getByRole('button', { name: /Bitcoin/i });
    await bitcoinOption.click();

    await expect(page.getByText('BTC', { exact: true })).toBeVisible({ timeout: 10_000 });

    const createIndexButton = page.getByRole('button', { name: 'Create index', exact: true });
    await expect(createIndexButton).toBeVisible({ timeout: 10_000 });
    await createIndexButton.click();

    await expect(page.getByText('Confirm Submission', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
  });
});
