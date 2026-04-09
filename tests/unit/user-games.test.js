import { describe, test, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('../../src/lib/bundled-registry.js', () => ({
  isBundledSlug: (slug) => slug === 'super-metroid',
}));

const {
  initUserGames,
  getUserGame,
  getAllUserGames,
  getUserSlugs,
  saveUserGame,
  removeUserGame,
  USER_GAMES_CHANGED,
} = await import('../../src/lib/user-games.js');

function makeGame(slug, title = 'Test Game') {
  return {
    slug,
    title,
    year: 1999,
    era: '1990s',
    totalEstimatedSituations: 1,
    areas: [
      {
        id: 'area-1',
        name: 'Area One',
        order: 1,
        situations: [
          {
            id: 'sit-1',
            title: 'Situation',
            order: 1,
            context: 'Hero, area, stuck',
            tags: ['test'],
            hints: ['Hint 1'],
          },
        ],
      },
    ],
  };
}

async function clearStore() {
  const req = indexedDB.open('retro-hints-db', 1);
  const db = await new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('user-games')) {
        db.createObjectStore('user-games', { keyPath: 'slug' });
      }
    };
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('user-games', 'readwrite');
    const store = tx.objectStore('user-games');
    const clearReq = store.clear();
    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });
  db.close();
}

beforeEach(async () => {
  await clearStore();
  await initUserGames();
});

describe('saveUserGame / getUserGame round-trip', () => {
  test('saves and retrieves a game', async () => {
    const game = makeGame('test-game');
    await saveUserGame(game);

    const retrieved = getUserGame('test-game');
    expect(retrieved).not.toBeNull();
    expect(retrieved.title).toBe('Test Game');
    expect(retrieved.isLocal).toBe(true);
  });

  test('overwrites an existing game with same slug', async () => {
    await saveUserGame(makeGame('test-game', 'Original'));
    await saveUserGame(makeGame('test-game', 'Updated'));

    expect(getUserGame('test-game').title).toBe('Updated');
    expect(getAllUserGames()).toHaveLength(1);
  });

  test('persists across re-init', async () => {
    await saveUserGame(makeGame('persist-test'));
    await initUserGames();

    expect(getUserGame('persist-test')).not.toBeNull();
  });
});

describe('removeUserGame', () => {
  test('removes a saved game from cache and IndexedDB', async () => {
    await saveUserGame(makeGame('to-remove'));
    expect(getUserGame('to-remove')).not.toBeNull();

    await removeUserGame('to-remove');
    expect(getUserGame('to-remove')).toBeNull();

    await initUserGames();
    expect(getUserGame('to-remove')).toBeNull();
  });

  test('no-ops for nonexistent slug', async () => {
    await expect(removeUserGame('nonexistent')).resolves.not.toThrow();
  });
});

describe('getAllUserGames / getUserSlugs', () => {
  test('returns all saved games', async () => {
    await saveUserGame(makeGame('game-a', 'Alpha'));
    await saveUserGame(makeGame('game-b', 'Beta'));

    const all = getAllUserGames();
    expect(all).toHaveLength(2);

    const slugs = getUserSlugs();
    expect(slugs).toContain('game-a');
    expect(slugs).toContain('game-b');
  });

  test('returns empty when no games saved', () => {
    expect(getAllUserGames()).toHaveLength(0);
    expect(getUserSlugs()).toHaveLength(0);
  });
});

describe('slug conflict rejection', () => {
  test('rejects slug that conflicts with bundled game', async () => {
    const game = makeGame('super-metroid');
    await expect(saveUserGame(game)).rejects.toThrow(/already used by a built-in game/);
  });

  test('rejects missing slug', async () => {
    await expect(saveUserGame({ title: 'No slug' })).rejects.toThrow(/missing slug/);
  });
});

describe('USER_GAMES_CHANGED event', () => {
  test('dispatches on save', async () => {
    const handler = vi.fn();
    window.addEventListener(USER_GAMES_CHANGED, handler);
    try {
      await saveUserGame(makeGame('event-test'));
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(USER_GAMES_CHANGED, handler);
    }
  });

  test('dispatches on remove', async () => {
    await saveUserGame(makeGame('event-remove'));
    const handler = vi.fn();
    window.addEventListener(USER_GAMES_CHANGED, handler);
    try {
      await removeUserGame('event-remove');
      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(USER_GAMES_CHANGED, handler);
    }
  });
});
