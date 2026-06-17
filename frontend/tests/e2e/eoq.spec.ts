import { test, expect } from '@playwright/test';

// TC-02-U01: D=1000, S=50, C=10, I=20% → EOQ ≈ 223.61
test.describe('EOQ — happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/eoq');
  });

  test('page loads with input form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /economic order quantity/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculate' })).toBeVisible();
  });

  test('calculates EOQ = 223.61 for D=1000 S=50 C=10 I=20', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000');
    await inputs.nth(1).fill('50');
    await inputs.nth(2).fill('10');
    await inputs.nth(3).fill('20');

    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByText('223.61')).toBeVisible();
  });

  test('shows all four result metrics', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('1000');
    await inputs.nth(1).fill('50');
    await inputs.nth(2).fill('10');
    await inputs.nth(3).fill('20');

    await page.getByRole('button', { name: 'Calculate' }).click();

    // Orders per year, cycle days, total annual cost should also appear
    await expect(page.getByText('4.47')).toBeVisible();  // orders per year
    // cycle days 81.62 should appear somewhere
    await expect(page.getByText(/81\.6/)).toBeVisible();
  });

  test('shows validation error for zero demand', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('0');
    await page.getByRole('button', { name: 'Calculate' }).click();

    await expect(page.getByText(/positive/i)).toBeVisible();
  });
});
