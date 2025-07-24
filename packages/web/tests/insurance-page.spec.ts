import { test, expect } from '@playwright/test';
import { ZEALY_QUEST_IDS } from '@/global-config';

test.describe('InsurancePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/insurance', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.react-loading-skeleton')).not.toBeVisible({
      timeout: 20000,
    });
  });

  test('renders the StatCard components and their values', async ({ page }) => {
    await expect(page.getByTestId('stat-card-normal-buffer')).toBeVisible();
    await expect(page.getByTestId('stat-card-total-normal-buffer')).not.toBeEmpty();

    await expect(page.getByTestId('stat-card-normal-insurance-fund')).toBeVisible();
    await expect(page.getByTestId('stat-card-total-normal-insurance-fund')).not.toBeEmpty();

    await expect(page.getByTestId('stat-card-insurance-staking-yield')).toBeVisible();
    await expect(page.getByTestId('stat-card-total-insurance-staking-yield')).not.toBeEmpty();
  });

  test('renders the StakeBalance card and opens modals', async ({ page }) => {
    await expect(page.getByTestId('stake-balance-card')).toBeVisible();

    await page.getByTestId('manage-stake-button').click();
    await expect(page.getByRole('dialog', { name: /manage stake/i })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId(`zealy-highlight-button-${ZEALY_QUEST_IDS.stakeFund}`).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('renders the InsuranceActionsTable component and switches tabs', async ({ page }) => {
    await expect(page.getByTestId('insurance-actions-table')).toBeVisible();

    await page.getByTestId('insurance-actions-tab-buffer').click();
    await expect(page.getByTestId('buffer-events-table')).toBeVisible();

    await page.getByTestId('insurance-actions-tab-user').click();
  });
});
