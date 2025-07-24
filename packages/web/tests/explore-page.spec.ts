import { test, expect } from '@playwright/test';

test.describe('ExplorePage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    await page.waitForURL('**/explore{/}');
    await expect(page.locator('.react-loading-skeleton')).not.toBeVisible({ timeout: 20000 });
  });

  test('renders the ExploreStats component and its stats', async ({ page }) => {
    await expect(page.getByTestId('explore-stats')).toBeVisible();

    await expect(page.getByTestId('explore-stat-1d-volume')).toBeVisible();
    await expect(page.getByTestId('explore-stat-total-tvl')).toBeVisible();
    await expect(page.getByTestId('explore-stat-total-pools')).toBeVisible();
  });

  test('renders the ExplorePoolsTable component and its rows', async ({ page }) => {
    await expect(page.getByTestId('explore-pools-table')).toBeVisible();

    // Check for the first row
    await expect(page.getByTestId('explore-pools-table-row-1')).toBeVisible();
  });
});
