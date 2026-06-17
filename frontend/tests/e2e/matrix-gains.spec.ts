import { test, expect } from '@playwright/test';

test.describe('Matrix Gains — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/matrix-gains');
  });

  test('page loads with table and Calculate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /matrix gains/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates maxi-max and maxi-min from default values', async ({ page }) => {
    await page.getByRole('button', { name: 'Calculate' }).click();

    // Result rows should appear in the table
    await expect(page.getByText(/maxi.max/i)).toBeVisible();
    await expect(page.getByText(/maxi.min/i)).toBeVisible();
  });

  test('shows summary cards after calculation', async ({ page }) => {
    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByText(/Maxi-Max/)).toBeVisible();
    await expect(page.getByText(/Maxi-Min/)).toBeVisible();
  });

  test('Clear resets results', async ({ page }) => {
    await page.getByRole('button', { name: 'Calculate' }).click();
    await page.getByRole('button', { name: 'Clear' }).click();

    await expect(page.getByText(/maxi.max/i)).not.toBeVisible();
  });
});
