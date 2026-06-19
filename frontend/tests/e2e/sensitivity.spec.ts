import { test, expect } from '@playwright/test';

test.describe('Sensitivity Analysis — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sensitivity');
  });

  test('page loads with model selector and Calculate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sensitivity analysis/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('model selector and parameter inputs are present', async ({ page }) => {
    // Model select exists
    await expect(page.locator('select')).toBeVisible();

    // EOQ fields: demand, orderingCost, unitCost, holdingRate + swing = 5 number inputs
    const inputs = page.locator('input[type="number"]');
    await expect(inputs).toHaveCount(5);

    // Clear button exists alongside Calculate
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('switching model to Break-even changes input fields', async ({ page }) => {
    await page.locator('select').selectOption('BREAKEVEN');

    // Break-even has 3 fields + swing = 4 number inputs
    const inputs = page.locator('input[type="number"]');
    await expect(inputs).toHaveCount(4);
  });
});
