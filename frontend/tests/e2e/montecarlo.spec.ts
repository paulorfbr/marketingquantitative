import { test, expect } from '@playwright/test';

test.describe('Monte Carlo Simulation — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/montecarlo');
  });

  test('page loads with Simulate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /monte carlo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible();
  });

  test('EOQ model has distribution selects and number inputs', async ({ page }) => {
    // 4 EOQ fields, each with a distribution select + 2 NORMAL inputs = 8 number inputs + 1 iterations = 9
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs).toHaveCount(9);

    // Each field has a distribution dropdown — there are 4 (one per EOQ field) + 1 model select = 5 selects
    const selects = page.locator('select');
    await expect(selects).toHaveCount(5);

    // Clear button exists
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('switching to UNIFORM distribution changes field inputs', async ({ page }) => {
    // Change distribution of first field (demand) from NORMAL to UNIFORM
    const distSelects = page.locator('select');
    // index 0 = model selector, index 1 = first field distribution
    await distSelects.nth(1).selectOption('UNIFORM');

    // UNIFORM shows min/max (2 inputs) instead of mean/stdDev (2 inputs) — count stays same
    // but the placeholders change; verify min/max placeholders appear
    await expect(page.locator('input[placeholder="Min"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="Max"]').first()).toBeVisible();
  });

  test('switching model to Break-even changes field set', async ({ page }) => {
    // Switch model to BREAKEVEN
    const modelSelect = page.locator('select').first();
    await modelSelect.selectOption('BREAKEVEN');

    // Break-even has 3 fields × 2 NORMAL inputs + 1 iterations = 7 number inputs
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs).toHaveCount(7);
  });
});
