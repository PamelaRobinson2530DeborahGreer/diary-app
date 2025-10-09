import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Create some test entries
    for (let i = 1; i <= 3; i++) {
      await page.click('button[aria-label="New entry"]');
      await page.locator('.ProseMirror').fill(`Test entry ${i} with unique content`);

      // Add different moods
      const moods = ['😊', '😔', '🤔'];
      await page.click(`text=${moods[i - 1]}`);

      await page.waitForTimeout(600);
      await page.click('button[aria-label="Back"]');
    }
  });

  test('should search by keyword', async ({ page }) => {
    // Type in search box
    await page.fill('input[placeholder="搜索..."]', 'unique');

    // All entries should be visible (they all contain "unique")
    await expect(page.locator('text=Test entry 1')).toBeVisible();
    await expect(page.locator('text=Test entry 2')).toBeVisible();
    await expect(page.locator('text=Test entry 3')).toBeVisible();

    // Search for specific entry
    await page.fill('input[placeholder="搜索..."]', 'entry 2');

    // Only entry 2 should be visible
    await expect(page.locator('text=Test entry 2')).toBeVisible();
    await expect(page.locator('text=Test entry 1')).not.toBeVisible();
    await expect(page.locator('text=Test entry 3')).not.toBeVisible();
  });

  test('should filter by mood', async ({ page }) => {
    // Click on a mood filter
    await page.click('.flex.flex-wrap.gap-2 >> text=😊');

    // Only entry with that mood should be visible
    await expect(page.locator('text=Test entry 1')).toBeVisible();
    await expect(page.locator('text=Test entry 2')).not.toBeVisible();
    await expect(page.locator('text=Test entry 3')).not.toBeVisible();
  });

  test('should combine search and mood filter', async ({ page }) => {
    // Search for "entry"
    await page.fill('input[placeholder="搜索..."]', 'entry');

    // Filter by mood
    await page.click('.flex.flex-wrap.gap-2 >> text=😔');

    // Only entry 2 should match both criteria
    await expect(page.locator('text=Test entry 2')).toBeVisible();
    await expect(page.locator('text=Test entry 1')).not.toBeVisible();
    await expect(page.locator('text=Test entry 3')).not.toBeVisible();
  });
});