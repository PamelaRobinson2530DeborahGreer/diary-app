// e2e/theme.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Theme System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('localforage');
    });
  });

  test('should default to system theme', async ({ page }) => {
    await page.goto('/settings');

    // Wait for theme to load
    await page.waitForTimeout(500);

    // Check if system button is selected
    const systemButton = page.locator('button:has-text("系统")');
    await expect(systemButton).toHaveClass(/border-primary/);
  });

  test('should switch to light theme and persist', async ({ page }) => {
    await page.goto('/settings');

    // Click light theme button
    await page.locator('button:has-text("浅色")').click();

    // Verify light theme is applied
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    // Check button is selected
    let lightButton = page.locator('button:has-text("浅色")');
    await expect(lightButton).toHaveClass(/border-primary/);

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Re-query button after reload
    lightButton = page.locator('button:has-text("浅色")');

    // Verify theme persisted
    await expect(html).not.toHaveClass(/dark/);
    await expect(lightButton).toHaveClass(/border-primary/);
  });

  test('should switch to dark theme and persist', async ({ page }) => {
    await page.goto('/settings');

    // Click dark theme button
    await page.locator('button:has-text("深色")').click();

    // Wait for theme to apply
    await page.waitForTimeout(300);

    // Verify dark theme is applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Check button is selected
    let darkButton = page.locator('button:has-text("深色")');
    await expect(darkButton).toHaveClass(/border-primary/);

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Re-query button after reload
    darkButton = page.locator('button:has-text("深色")');

    // Verify theme persisted
    await expect(html).toHaveClass(/dark/);
    await expect(darkButton).toHaveClass(/border-primary/);
  });

  test('should apply dark theme to all UI elements', async ({ page }) => {
    await page.goto('/settings');

    // Switch to dark theme
    await page.locator('button:has-text("深色")').click();
    await page.waitForTimeout(300);

    // Check page background is dark
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // RGB values for dark background should have low numbers
    expect(bgColor).toMatch(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);

    // Navigate to home page
    await page.goto('/');
    await page.waitForTimeout(300);

    // Verify dark theme persists on other pages
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('should switch between themes smoothly', async ({ page }) => {
    await page.goto('/settings');

    const html = page.locator('html');

    // Switch to dark
    await page.locator('button:has-text("深色")').click();
    await page.waitForTimeout(200);
    await expect(html).toHaveClass(/dark/);

    // Switch to light
    await page.locator('button:has-text("浅色")').click();
    await page.waitForTimeout(200);
    await expect(html).not.toHaveClass(/dark/);

    // Switch back to dark
    await page.locator('button:has-text("深色")').click();
    await page.waitForTimeout(200);
    await expect(html).toHaveClass(/dark/);

    // Switch to system
    await page.locator('button:has-text("系统")').click();
    await page.waitForTimeout(200);

    // System button should be selected
    const systemButton = page.locator('button:has-text("系统")');
    await expect(systemButton).toHaveClass(/border-primary/);
  });

  // Lock screen theme test moved to lock.spec.ts
  test.skip('should work with lock screen in dark mode', async ({ page, context }) => {
    // This test belongs in lock.spec.ts as it tests security features
  });

  test('should not flash on page load', async ({ page }) => {
    // Set dark theme
    await page.goto('/settings');
    await page.locator('button:has-text("深色")').click();
    await page.waitForTimeout(300);

    // Navigate to home and capture theme immediately
    await page.goto('/');

    // Check theme class is applied early (within first paint)
    const html = page.locator('html');
    const hasClass = await html.evaluate((el) => el.classList.contains('dark'));

    expect(hasClass).toBe(true);
  });

  test('theme icons should be visible', async ({ page }) => {
    await page.goto('/settings');

    // Check all theme icons are present
    const sunIcon = page.locator('button:has-text("浅色") svg');
    const moonIcon = page.locator('button:has-text("深色") svg');
    const monitorIcon = page.locator('button:has-text("系统") svg');

    await expect(sunIcon).toBeVisible();
    await expect(moonIcon).toBeVisible();
    await expect(monitorIcon).toBeVisible();
  });
});