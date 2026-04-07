import { describe, test, expect } from 'vitest';
import { search } from '../../src/lib/search.js';
import { getGame } from '../../src/lib/data-loader.js';

describe('global search', () => {
  test('finds situations by title keyword', () => {
    const results = search('boss');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.title.toLowerCase().includes('boss') || r.tags.some(t => t.includes('boss')))).toBe(true);
  });

  test('finds situations by tag', () => {
    const results = search('missiles');
    expect(results.length).toBeGreaterThan(0);
  });

  test('returns empty for short queries', () => {
    expect(search('a')).toHaveLength(0);
    expect(search('')).toHaveLength(0);
  });

  test('results include breadcrumb fields', () => {
    const results = search('kraid');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('gameSlug');
    expect(results[0]).toHaveProperty('gameTitle');
    expect(results[0]).toHaveProperty('areaId');
    expect(results[0]).toHaveProperty('areaName');
    expect(results[0]).toHaveProperty('situationId');
    expect(results[0]).toHaveProperty('title');
  });
});

describe('game-scoped search', () => {
  test('only returns results from the specified game', () => {
    const sm = getGame('super-metroid');
    const results = search('boss', sm);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(r.gameSlug).toBe('super-metroid');
    });
  });

  test('tolerates typos (fuzzy matching)', () => {
    const sm = getGame('super-metroid');
    const results = search('kraid boos', sm);
    // Should still find Kraid boss due to lenient threshold
    expect(results.length).toBeGreaterThan(0);
  });
});
