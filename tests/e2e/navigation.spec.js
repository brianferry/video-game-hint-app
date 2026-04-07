import { test, expect } from '@playwright/test';

test.describe('Home view', () => {
  test('loads with game list visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-test="game-list"]')).toBeVisible();
    await expect(page.locator('[data-test="game-list"] button')).toHaveCount(1);
  });

  test('shows game titles and metadata', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-test="game-card-super-metroid"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Super Metroid');
    await expect(card).toContainText('1994');
    await expect(card).toContainText('areas');
    await expect(card).toContainText('hints');
  });

  test('has search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-test="search"]')).toBeVisible();
  });
});

test.describe('Navigation flow', () => {
  test('home → game → area → situation → breadcrumb back', async ({ page }) => {
    await page.goto('/');

    // Click a game
    await page.locator('[data-test="game-card-super-metroid"]').click();
    await expect(page).toHaveURL(/game=super-metroid/);
    await expect(page.locator('.view-title')).toContainText('Super Metroid');

    // Click an area
    await page.getByText('Ceres Station').click();
    await expect(page).toHaveURL(/area=ceres-station/);

    // Click a situation
    await page.getByText('Fighting Ridley at Ceres Station').click();
    await expect(page).toHaveURL(/situation=ceres-ridley/);
    await expect(page.locator('.view-title')).toContainText('Fighting Ridley');

    // Breadcrumb back to area
    await page.locator('.breadcrumb button', { hasText: 'Ceres Station' }).click();
    await expect(page).toHaveURL(/area=ceres-station/);
    await expect(page).not.toHaveURL(/situation=/);

    // Breadcrumb back to game
    await page.locator('.breadcrumb button', { hasText: 'Super Metroid' }).click();
    await expect(page).toHaveURL(/game=super-metroid/);
    await expect(page).not.toHaveURL(/area=/);

    // Breadcrumb back to home
    await page.locator('.breadcrumb button', { hasText: 'Home' }).click();
    await expect(page).not.toHaveURL(/game=/);
  });

  test('app name button returns to home', async ({ page }) => {
    await page.goto('/?game=super-metroid');
    await page.locator('.app-name').click();
    await expect(page).not.toHaveURL(/game=/);
    await expect(page.locator('[data-test="game-list"]')).toBeVisible();
  });
});

test.describe('Hint reveal', () => {
  test('hints are collapsed by default', async ({ page }) => {
    await page.goto('/?game=super-metroid&area=ceres-station&situation=ceres-ridley');
    const hints = page.locator('.hint-card');
    await expect(hints).toHaveCount(3);

    // All should show reveal buttons, no content visible yet
    await expect(page.locator('.hint-reveal-btn')).toHaveCount(3);
    await expect(page.locator('.hint-content')).toHaveCount(0);
  });

  test('reveals hints in order, cannot skip', async ({ page }) => {
    await page.goto('/?game=super-metroid&area=ceres-station&situation=ceres-ridley');

    // Hint 2 and 3 buttons should be disabled
    const btn2 = page.locator('.hint-reveal-btn').nth(1);
    const btn3 = page.locator('.hint-reveal-btn').nth(2);
    await expect(btn2).toBeDisabled();
    await expect(btn3).toBeDisabled();

    // Click hint 1
    await page.locator('.hint-reveal-btn').first().click();
    await expect(page.locator('.hint-content')).toHaveCount(1);

    // Now hint 2 should be enabled, hint 3 still disabled
    await expect(page.locator('.hint-reveal-btn').first()).toBeEnabled();
    await expect(page.locator('.hint-reveal-btn').nth(1)).toBeDisabled();

    // Click hint 2
    await page.locator('.hint-reveal-btn').first().click();
    await expect(page.locator('.hint-content')).toHaveCount(2);
  });

  test('hint content renders markdown', async ({ page }) => {
    await page.goto('/?game=super-metroid&area=ceres-station&situation=ceres-ridley');
    // Reveal hint 1, then hint 2 (hint 2 has **Ridley** in bold)
    await page.locator('.hint-reveal-btn').first().click();
    await page.locator('.hint-reveal-btn').first().click();

    const content = page.locator('.hint-content').nth(1);
    await expect(content.locator('strong')).toContainText('Ridley');
  });
});

test.describe('Search', () => {
  test('global search finds results', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="search"]').fill('boss');

    // Wait for debounced results
    await page.waitForTimeout(400);
    const results = page.locator('[data-test="search-result"]');
    await expect(results.first()).toBeVisible();
  });

  test('clicking search result navigates to situation', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="search"]').fill('kraid');
    await page.waitForTimeout(400);

    await page.locator('[data-test="search-result"]').first().click();
    await expect(page).toHaveURL(/situation=/);
    await expect(page.locator('.hint-card')).toHaveCount(3);
  });

  test('shows no results message for unmatched query', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="search"]').fill('xyznonexistent');
    await page.waitForTimeout(400);
    await expect(page.locator('.placeholder')).toContainText('No results');
  });
});

test.describe('Theme toggle', () => {
  test('toggles between light and dark', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');

    // Click theme toggle
    await page.locator('.theme-toggle').click();
    const themeAfterClick = await html.getAttribute('data-theme');

    // Click again — should toggle back
    await page.locator('.theme-toggle').click();
    const themeAfterSecondClick = await html.getAttribute('data-theme');

    expect(themeAfterClick).not.toBe(themeAfterSecondClick);
  });
});

test.describe('URL-based routing', () => {
  test('direct URL to game view works', async ({ page }) => {
    await page.goto('/?game=super-metroid');
    await expect(page.locator('.view-title')).toContainText('Super Metroid');
  });

  test('direct URL to situation view works', async ({ page }) => {
    await page.goto('/?game=super-metroid&area=kraids-lair&situation=kraid-boss');
    await expect(page.locator('.view-title')).toContainText('Kraid');
  });

  test('browser back button works', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="game-card-super-metroid"]').click();
    await expect(page).toHaveURL(/game=super-metroid/);

    await page.goBack();
    await expect(page).not.toHaveURL(/game=/);
    await expect(page.locator('[data-test="game-list"]')).toBeVisible();
  });
});
