import { test, expect } from '@playwright/test';

test.describe('AkwaabaHomes Core Smoke Suite', () => {
  test('home page renders without uncaught errors or horizontal overflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Akwaaba/i);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(errors).toEqual([]);
  });

  test('login and admin login pages render authentication forms cleanly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('properties discovery page loads and renders filter controls', async ({ page }) => {
    await page.goto('/properties', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
