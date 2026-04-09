import { getBundledGame, getAllBundledGames } from './bundled-registry.js';
import { getUserGame, getAllUserGames } from './user-games.js';

/**
 * Get a game by slug. Bundled games take precedence if both existed (should not happen).
 * @param {string} slug
 * @returns {object | null}
 */
export function getGame(slug) {
  return getBundledGame(slug) || getUserGame(slug) || null;
}

/**
 * Get all games as an array, sorted by title (bundled + user guides on this device).
 */
export function getAllGames() {
  const bundled = getAllBundledGames();
  const user = getAllUserGames();
  return [...bundled, ...user].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Get the game index (lightweight entries for the home view).
 * Computes area/situation counts and coverage % from the full data.
 */
export function getGameIndex() {
  return getAllGames().map((game) => {
    const situationCount =
      game.areas?.reduce((sum, a) => sum + (a.situations?.length || 0), 0) || 0;
    const total = game.totalEstimatedSituations || 0;
    const coverage = total > 0 ? Math.round((situationCount / total) * 100) : null;

    return {
      slug: game.slug,
      title: game.title,
      year: game.year,
      era: game.era,
      areaCount: game.areas?.length || 0,
      situationCount,
      totalEstimatedSituations: total,
      coverage,
      quality: game.quality || null,
      isLocal: Boolean(game.isLocal),
    };
  });
}
