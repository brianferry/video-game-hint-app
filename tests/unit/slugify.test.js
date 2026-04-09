import { describe, test, expect } from 'vitest';
import { slugifyTitle } from '../../src/lib/slugify.js';

describe('slugifyTitle', () => {
  test('lowercases and hyphenates', () => {
    expect(slugifyTitle('Super Metroid')).toBe('super-metroid');
  });

  test('strips punctuation', () => {
    expect(slugifyTitle('Game: Part II!!!')).toBe('game-part-ii');
  });

  test('fallback for empty input', () => {
    expect(slugifyTitle('')).toBe('my-game');
    expect(slugifyTitle('   ')).toBe('my-game');
  });

  test('non-ASCII or punctuation-only title gets stable disambiguated slug', () => {
    expect(slugifyTitle('!!!')).toMatch(/^game-[a-z0-9]{7,8}$/);
    expect(slugifyTitle('!!!')).toBe(slugifyTitle('!!!'));
    expect(slugifyTitle('ポケットモンスター')).toMatch(/^game-[a-z0-9]{7,8}$/);
    expect(slugifyTitle('ポケットモンスター')).not.toBe(slugifyTitle('!!!'));
  });
});
