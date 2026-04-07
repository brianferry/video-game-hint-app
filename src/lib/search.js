import Fuse from 'fuse.js';
import { getAllGames } from './data-loader.js';

/**
 * Flatten all games into searchable situation records.
 * Each record carries enough context for breadcrumb display + navigation.
 */
function flattenSituations(games) {
  const records = [];
  for (const game of games) {
    for (const area of game.areas || []) {
      for (const situation of area.situations || []) {
        records.push({
          gameSlug: game.slug,
          gameTitle: game.title,
          areaId: area.id,
          areaName: area.name,
          situationId: situation.id,
          title: situation.title,
          context: situation.context || '',
          tags: situation.tags || [],
          order: situation.order || 0,
        });
      }
    }
  }
  return records;
}

const FUSE_OPTIONS = {
  threshold: 0.4,
  minMatchCharLength: 2,
  includeScore: true,
  keys: [
    { name: 'title', weight: 2 },
    { name: 'tags', weight: 1.5 },
    { name: 'context', weight: 1.2 },
    { name: 'areaName', weight: 1 },
    { name: 'gameTitle', weight: 1 },
  ],
};

let globalIndex = null;
const gameIndexes = new Map();

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
  const index = new Fuse(records, {
    ...FUSE_OPTIONS,
    keys: [
      { name: 'title', weight: 2 },
      { name: 'tags', weight: 1.5 },
      { name: 'context', weight: 1.2 },
      { name: 'areaName', weight: 1 },
    ],
  });
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
