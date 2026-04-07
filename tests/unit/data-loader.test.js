import { describe, test, expect } from 'vitest';
import { getGame, getAllGames, getGameIndex } from '../../src/lib/data-loader.js';

describe('getGame', () => {
  test('returns game data by slug', () => {
    const game = getGame('super-metroid');
    expect(game).not.toBeNull();
    expect(game.title).toBe('Super Metroid');
    expect(game.year).toBe(1994);
  });

  test('returns null for unknown slug', () => {
    expect(getGame('nonexistent-game')).toBeNull();
  });

  test('game has areas with situations', () => {
    const game = getGame('super-metroid');
    expect(game.areas.length).toBeGreaterThan(0);
    expect(game.areas[0].situations.length).toBeGreaterThan(0);
  });
});

describe('getAllGames', () => {
  test('returns all games sorted by title', () => {
    const games = getAllGames();
    expect(games.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < games.length; i++) {
      expect(games[i].title.localeCompare(games[i - 1].title)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getGameIndex', () => {
  test('returns lightweight game entries with counts', () => {
    const index = getGameIndex();
    expect(index.length).toBeGreaterThanOrEqual(1);

    const sm = index.find((g) => g.slug === 'super-metroid');
    expect(sm).toBeDefined();
    expect(sm.areaCount).toBeGreaterThan(0);
    expect(sm.situationCount).toBeGreaterThan(0);
    expect(sm.year).toBe(1994);
  });
});
