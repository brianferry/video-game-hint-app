/**
 * Shared search utilities used by both the Vite frontend and the Node.js MCP server.
 * Keep this module free of browser/Vite-specific APIs.
 */

/**
 * Flatten games into searchable situation records.
 * Each record carries enough context for breadcrumb display + navigation.
 */
export function flattenSituations(games) {
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

export const FUSE_OPTIONS = {
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

/** FUSE_OPTIONS variant that omits gameTitle (for single-game scoped search). */
export const FUSE_OPTIONS_SINGLE_GAME = {
  ...FUSE_OPTIONS,
  keys: FUSE_OPTIONS.keys.filter(k => k.name !== 'gameTitle'),
};
