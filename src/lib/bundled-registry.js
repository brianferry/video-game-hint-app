/**
 * Build-time bundled games only (Vite glob). Used by data-loader and
 * user-games / validation to detect slug collisions without circular imports.
 */
const gameModules = import.meta.glob('../data/games/**/*.json', {
  eager: true,
  import: 'default',
});

let registry = null;

function buildRegistry() {
  if (registry) return registry;
  registry = new Map();
  for (const [, data] of Object.entries(gameModules)) {
    if (data && data.slug) {
      registry.set(data.slug, data);
    }
  }
  return registry;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isBundledSlug(slug) {
  return buildRegistry().has(slug);
}

/**
 * @param {string} slug
 * @returns {object | null}
 */
export function getBundledGame(slug) {
  return buildRegistry().get(slug) || null;
}

/**
 * @returns {object[]}
 */
export function getAllBundledGames() {
  return Array.from(buildRegistry().values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}
