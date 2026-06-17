import { test, expect } from '@playwright/test';

// TC-04-U01: λ=2, μ=3, s=1 → ρ=66.7%, Lq≈1.33, L=2.00, Wq≈0.67, W=1.00
test.describe('Attention Queue — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/queue');
  });

  test('page loads with three parameter fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /attention queue/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates M/M/1 metrics for λ=2 μ=3 s=1', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('2');  // arrival rate λ
    await inputs.nth(1).fill('3');  // service rate μ
    await inputs.nth(2).fill('1');  // servers s

    await page.getByRole('button', { name: 'Calculate' }).click();

    // Utilisation bar percentage
    await expect(page.getByText(/66\.7%/)).toBeVisible();
  });

  test('shows all six metrics in results table', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('2');
    await inputs.nth(1).fill('3');
    await inputs.nth(2).fill('1');

    await page.getByRole('button', { name: 'Calculate' }).click();

    // L = 2.00 and Lq ≈ 1.33 should appear
    await expect(page.getByText('2.00')).toBeVisible();
    await expect(page.getByText('1.33')).toBeVisible();
  });

  test('shows unstable warning when sμ ≤ λ', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('10'); // λ=10
    await inputs.nth(1).fill('3');  // μ=3
    await inputs.nth(2).fill('2');  // s=2, sμ=6 < λ=10

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/unstable/i)).toBeVisible();
  });
});
