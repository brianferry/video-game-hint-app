import Fuse from 'fuse.js';
import { getAllGames } from './data-loader.js';
import { USER_GAMES_CHANGED } from './user-games.js';
import { flattenSituations, FUSE_OPTIONS, FUSE_OPTIONS_SINGLE_GAME } from './search-shared.js';

let globalIndex = null;
const gameIndexes = new Map();

/**
 * Clear cached Fuse indexes (call after user adds/removes a local guide).
 */
export function invalidateSearchCaches() {
  globalIndex = null;
  gameIndexes.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener(USER_GAMES_CHANGED, () => {
    invalidateSearchCaches();
  });
}

/**
 * Build (or return cached) global search index across all games.
 */
function getGlobalIndex() {
  if (globalIndex) return globalIndex;
  const records = flattenSituations(getAllGames());
  globalIndex = new Fuse(records, FUSE_OPTIONS);
  return globalIndex;
}

/**
 * Build (or return cached) search index scoped to a single game.
 */
function getGameIndex(gameSlug, gameData) {
  if (gameIndexes.has(gameSlug)) return gameIndexes.get(gameSlug);
  const records = flattenSituations([gameData]);
  const index = new Fuse(records, FUSE_OPTIONS_SINGLE_GAME);
  gameIndexes.set(gameSlug, index);
  return index;
}

/**
 * Search for situations. Pass gameData to scope to a single game.
 * Returns an array of { gameSlug, gameTitle, areaId, areaName, situationId, title, tags, score }.
 */
export function search(query, gameData = null) {
  if (!query || query.length < 2) return [];
  const index = gameData
    ? getGameIndex(gameData.slug, gameData)
    : getGlobalIndex();
  return index.search(query).map((result) => ({
    ...result.item,
    score: result.score,
  }));
}
