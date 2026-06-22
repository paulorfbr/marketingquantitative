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

  test('calculates EOQ sensitivity and renders tornado chart', async ({ page }) => {
    // Mock the calculate endpoint
    await page.route('/api/sensitivity/calculate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseOutput: 223.61,
          parameters: [
            { paramKey: 'demand',       lowValue: 800,  highValue: 1200, lowOutput: 200.0, highOutput: 250.0, impact: 50.0 },
            { paramKey: 'orderingCost', lowValue: 40,   highValue: 60,   lowOutput: 210.0, highOutput: 240.0, impact: 30.0 },
            { paramKey: 'unitCost',     lowValue: 8,    highValue: 12,   lowOutput: 215.0, highOutput: 233.0, impact: 18.0 },
            { paramKey: 'holdingRate',  lowValue: 0.16, highValue: 0.24, lowOutput: 218.0, highOutput: 229.0, impact: 11.0 },
          ]
        })
      });
    });

    // Fill base inputs
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000');
    await inputs.nth(1).fill('50');
    await inputs.nth(2).fill('10');
    await inputs.nth(3).fill('0.2');

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.locator('svg')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(4);
  });
});
