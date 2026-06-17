import { test, expect } from '@playwright/test';

// Default example tree: Decision → Option A (Chance: 0.6×100 + 0.4×50 = 80) vs Option B (60)
// Root EMV = max(80, 60) = 80.00
test.describe('Decision Tree — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/decision-tree');
  });

  test('page loads with tree builder and Calculate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /decision tree/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates root EMV = $80.00 from default example', async ({ page }) => {
    await page.getByRole('button', { name: 'Calculate' }).click();

    // Root EMV card
    await expect(page.getByText('$80.00')).toBeVisible();
  });

  test('renders SVG tree diagram after calculation', async ({ page }) => {
    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.locator('svg[aria-label*="Decision tree"]')).toBeVisible();
  });

  test('shows validation error for probabilities not summing to 1', async ({ page }) => {
    // Change the first branch probability to 0.9 (sum will exceed 1.0)
    const probInputs = page.locator('input[type="number"]');
    // Find a probability input (one that accepts 0.0–1.0 step 0.01)
    const probInput = page.locator('input[min="0"][max="1"][step="0.01"]').first();
    await probInput.fill('0.9');

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Reset to Example restores default tree', async ({ page }) => {
    // Modify something then reset
    await page.getByRole('button', { name: 'Calculate' }).click();
    await page.getByRole('button', { name: 'Reset to Example' }).click();

    // Result should be cleared
    await expect(page.getByText('$80.00')).not.toBeVisible();
  });
});
