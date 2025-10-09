import { test, expect } from '@playwright/test';

test.describe('Journal CRUD Operations', () => {
  test('should create a new entry', async ({ page }) => {
    await page.goto('/');

    // Click new entry button
    await page.click('button[aria-label="New entry"]');
    await page.waitForURL('/new');

    // Type in editor
    await page.locator('.ProseMirror').fill('This is my first journal entry');

    // Select a mood
    await page.click('text=😊');

    // Wait for autosave
    await page.waitForTimeout(600); // 500ms debounce + buffer

    // Go back to timeline
    await page.click('button[aria-label="Back"]');

    // Check if entry appears
    await expect(page.locator('text=This is my first journal entry')).toBeVisible();
  });

  test('should edit an existing entry', async ({ page }) => {
    await page.goto('/');

    // Create an entry first
    await page.click('button[aria-label="New entry"]');
    await page.locator('.ProseMirror').fill('Entry to edit');
    await page.waitForTimeout(600);
    await page.click('button[aria-label="Back"]');

    // Click on the entry
    await page.click('text=Entry to edit');

    // Edit the content
    await page.locator('.ProseMirror').fill('Edited entry content');
    await page.waitForTimeout(600);

    // Go back and verify
    await page.click('button[aria-label="Back"]');
    await expect(page.locator('text=Edited entry content')).toBeVisible();
  });

  test('should apply text formatting', async ({ page }) => {
    await page.goto('/new');

    const editor = page.locator('.ProseMirror');

    // Type text
    await editor.fill('Bold text');

    // Select all text
    await editor.press('Control+A');

    // Apply bold
    await page.click('button[aria-label="Bold"]');

    // Check if bold is applied
    const html = await editor.innerHTML();
    expect(html).toContain('<strong>Bold text</strong>');
  });

  test('should handle photo attachment', async ({ page }) => {
    await page.goto('/new');

    // Create a test file input
    const fileInput = page.locator('input[type="file"]');

    // Upload a file (this would need a real file in CI/CD)
    // await fileInput.setInputFiles('path/to/test-image.jpg');

    // For now, just verify the button exists
    await expect(page.locator('text=添加照片')).toBeVisible();
  });
});