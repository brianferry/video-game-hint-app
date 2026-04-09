import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const views = [
  { name: 'Home', url: '/' },
  { name: 'Game', url: '/?game=super-metroid' },
  { name: 'Area', url: '/?game=super-metroid&area=ceres-station' },
  {
    name: 'Situation',
    url: '/?game=super-metroid&area=ceres-station&situation=ceres-ridley',
  },
];

for (const view of views) {
  test(`${view.name} view passes WCAG 2.1 AA (light theme)`, async ({ page }) => {
    await page.goto(view.url);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'light';
    });
    await expect(page.locator('#main-content')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test(`${view.name} view passes WCAG 2.1 AA (dark theme)`, async ({ page }) => {
    await page.goto(view.url);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark';
    });
    await expect(page.locator('#main-content')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test('skip link is present and targets main content', async ({ page }) => {
  await page.goto('/');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toHaveAttribute('href', '#main-content');

  // Tab to it and check it becomes visible
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
});

test('theme toggle has accessible label', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle).toHaveAttribute('aria-label', /Switch to .+ mode/);
});

test('hint reveal buttons have accessible labels', async ({ page }) => {
  await page.goto(
    '/?game=super-metroid&area=ceres-station&situation=ceres-ridley'
  );
  const buttons = page.locator('.hint-reveal-btn');
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    await expect(buttons.nth(i)).toHaveAttribute('aria-label', /Show hint \d+ of \d+/);
  }
});
