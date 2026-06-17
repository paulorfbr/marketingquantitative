import { test, expect } from '@playwright/test';

// CF=5000, CVu=30, P=50 → BEQ = 5000/(50-30) = 250.00
test.describe('Break-even — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/breakeven');
  });

  test('page loads with three input fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /break.even/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates break-even quantity = 250.00', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('5000'); // Fixed Costs
    await inputs.nth(1).fill('30');   // Variable Cost per Unit
    await inputs.nth(2).fill('50');   // Selling Price per Unit

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByText('250.00')).toBeVisible();
  });

  test('shows contribution margin = $20.00', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('5000');
    await inputs.nth(1).fill('30');
    await inputs.nth(2).fill('50');

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByText('$20.00')).toBeVisible();
  });

  test('renders SVG chart after calculation', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('5000');
    await inputs.nth(1).fill('30');
    await inputs.nth(2).fill('50');

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.locator('svg[aria-label*="Break-even"]')).toBeVisible();
  });

  test('shows cross-field error when price ≤ variable cost', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000');
    await inputs.nth(1).fill('50');
    await inputs.nth(2).fill('30'); // P < CVu

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
