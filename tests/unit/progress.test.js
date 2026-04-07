import { describe, test, expect, beforeEach } from 'vitest';
import { getProgress, saveProgress, trackView, getTheme, saveTheme } from '../../src/lib/progress.js';

beforeEach(() => {
  localStorage.clear();
});

describe('hint progress', () => {
  test('returns default when no progress saved', () => {
    const p = getProgress('super-metroid', 'ceres-station', 'ceres-ridley');
    expect(p.revealedCount).toBe(0);
  });

  test('saves and retrieves progress', () => {
    saveProgress('super-metroid', 'ceres-station', 'ceres-ridley', 2);
    const p = getProgress('super-metroid', 'ceres-station', 'ceres-ridley');
    expect(p.revealedCount).toBe(2);
    expect(p.viewedAt).toBeTruthy();
  });

  test('different situations have independent progress', () => {
    saveProgress('super-metroid', 'ceres-station', 'ceres-ridley', 3);
    saveProgress('super-metroid', 'ceres-station', 'ceres-escape', 1);
    expect(getProgress('super-metroid', 'ceres-station', 'ceres-ridley').revealedCount).toBe(3);
    expect(getProgress('super-metroid', 'ceres-station', 'ceres-escape').revealedCount).toBe(1);
  });
});

describe('analytics', () => {
  test('tracks view counts', () => {
    trackView('super-metroid', 'ceres-station', 'ceres-ridley');
    trackView('super-metroid', 'ceres-station', 'ceres-ridley');
    trackView('super-metroid', 'ceres-station', 'ceres-ridley');

    const analytics = JSON.parse(localStorage.getItem('analytics'));
    expect(analytics.situations['super-metroid/ceres-station/ceres-ridley'].viewCount).toBe(3);
  });

  test('tracks multiple situations independently', () => {
    trackView('super-metroid', 'ceres-station', 'ceres-ridley');
    trackView('super-metroid', 'crateria', 'landing-site');
    trackView('super-metroid', 'crateria', 'landing-site');

    const analytics = JSON.parse(localStorage.getItem('analytics'));
    expect(analytics.situations['super-metroid/ceres-station/ceres-ridley'].viewCount).toBe(1);
    expect(analytics.situations['super-metroid/crateria/landing-site'].viewCount).toBe(2);
  });
});

describe('theme', () => {
  test('returns null when no theme saved', () => {
    expect(getTheme()).toBeNull();
  });

  test('saves and retrieves theme', () => {
    saveTheme('dark');
    expect(getTheme()).toBe('dark');
    saveTheme('light');
    expect(getTheme()).toBe('light');
  });
});
