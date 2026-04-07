/**
 * Eagerly import all game JSON files at build time.
 * Vite bundles them into the single-file output.
 *
 * Keys look like: '../data/games/1990s/super-metroid.json'
 * Values are the parsed JSON (default export).
 */
const gameModules = import.meta.glob('../data/games/**/*.json', {
  eager: true,
  import: 'default',
});

/** Map of slug → game data (built once on first access) */
let gamesBySlug = null;

function buildRegistry() {
  if (gamesBySlug) return gamesBySlug;
  gamesBySlug = new Map();
  for (const [, data] of Object.entries(gameModules)) {
    if (data && data.slug) {
      gamesBySlug.set(data.slug, data);
    }
  }
  return gamesBySlug;
}

/**
 * Get a game by slug. Returns the full game object or null.
 */
export function getGame(slug) {
  return buildRegistry().get(slug) || null;
}

/**
 * Get all games as an array, sorted by title.
 */
export function getAllGames() {
  return Array.from(buildRegistry().values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
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
    };
  });
}
