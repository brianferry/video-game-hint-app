#!/usr/bin/env node

/**
 * Retro Game Hints — MCP Server
 *
 * Exposes the hint database as MCP tools so AI assistants can browse games,
 * search for hints, reveal hints progressively, and more.
 *
 * Start:
 *   node tools/mcp-server.js
 *
 * Configure in claude_desktop_config.json or .claude/settings.json:
 *   {
 *     "mcpServers": {
 *       "retro-hints": {
 *         "command": "node",
 *         "args": ["tools/mcp-server.js"],
 *         "cwd": "<path-to-hint-app>"
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const GAMES_DIR = resolve(PROJECT_ROOT, 'src', 'data', 'games');

// ---------------------------------------------------------------------------
// Data loading (filesystem-based, no Vite)
// ---------------------------------------------------------------------------

let gamesCache = null;

function loadAllGames() {
  if (gamesCache) return gamesCache;
  gamesCache = new Map();

  function scanDir(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (entry.endsWith('.json')) {
        try {
          const data = JSON.parse(readFileSync(full, 'utf-8'));
          if (data && data.slug) {
            gamesCache.set(data.slug, data);
          }
        } catch { /* skip invalid JSON */ }
      }
    }
  }

  scanDir(GAMES_DIR);
  return gamesCache;
}

function getGame(slug) {
  return loadAllGames().get(slug) || null;
}

function getAllGames() {
  return Array.from(loadAllGames().values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

// ---------------------------------------------------------------------------
// Search (Fuse.js, same config as the frontend)
// ---------------------------------------------------------------------------

let searchIndex = null;

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
        });
      }
    }
  }
  return records;
}

function getSearchIndex() {
  if (searchIndex) return searchIndex;
  searchIndex = new Fuse(flattenSituations(getAllGames()), {
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
  });
  return searchIndex;
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'retro-game-hints',
  version: '1.0.0',
});

// --- list_games ---
server.tool(
  'list_games',
  'List all available games with coverage stats, situation counts, and quality ratings',
  {},
  async () => {
    const games = getAllGames().map(game => {
      const situationCount = game.areas?.reduce(
        (sum, a) => sum + (a.situations?.length || 0), 0
      ) || 0;
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
        coverage: coverage !== null ? `${coverage}%` : 'unknown',
        quality: game.quality ? `${game.quality.stars}/5 stars` : 'unrated',
      };
    });
    return { content: [{ type: 'text', text: JSON.stringify(games, null, 2) }] };
  }
);

// --- get_game ---
server.tool(
  'get_game',
  'Get detailed info about a game: areas, situation counts, sources, and quality breakdown',
  { slug: z.string().describe('Game slug (e.g. "super-metroid")') },
  async ({ slug }) => {
    const game = getGame(slug);
    if (!game) {
      return { content: [{ type: 'text', text: `Game not found: ${slug}` }], isError: true };
    }
    const result = {
      slug: game.slug,
      title: game.title,
      year: game.year,
      era: game.era,
      quality: game.quality || null,
      sources: game.sources || [],
      areas: (game.areas || []).map(a => ({
        id: a.id,
        name: a.name,
        situationCount: a.situations?.length || 0,
        situations: (a.situations || []).map(s => ({
          id: s.id,
          title: s.title,
          tags: s.tags || [],
          hintCount: s.hints?.length || 0,
        })),
      })),
    };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// --- get_situation ---
server.tool(
  'get_situation',
  'Get a specific situation with its hints. By default only shows the first unrevealed hint (progressive reveal). Use show_all=true to see everything.',
  {
    game: z.string().describe('Game slug'),
    area: z.string().describe('Area ID'),
    situation: z.string().describe('Situation ID'),
    show_all: z.boolean().optional().default(false).describe('Show all hints at once (bypasses progressive reveal)'),
  },
  async ({ game: gameSlug, area: areaId, situation: situationId, show_all }) => {
    const gameData = getGame(gameSlug);
    if (!gameData) return { content: [{ type: 'text', text: `Game not found: ${gameSlug}` }], isError: true };

    const area = gameData.areas?.find(a => a.id === areaId);
    if (!area) return { content: [{ type: 'text', text: `Area not found: ${areaId}` }], isError: true };

    const situation = area.situations?.find(s => s.id === situationId);
    if (!situation) return { content: [{ type: 'text', text: `Situation not found: ${situationId}` }], isError: true };

    const hints = situation.hints || [];
    const result = {
      game: gameData.title,
      area: area.name,
      title: situation.title,
      context: situation.context,
      tags: situation.tags,
      totalHints: hints.length,
    };

    if (show_all) {
      result.hints = hints;
    } else {
      result.hint = hints[0] || 'No hints available';
      result.remainingHints = Math.max(0, hints.length - 1);
      result.note = hints.length > 1
        ? 'Use get_hint to reveal more hints progressively, or set show_all=true to see everything.'
        : undefined;
    }

    // Include source refs
    if (situation.sourceRefs?.length > 0 && gameData.sources) {
      result.sourceRefs = situation.sourceRefs.map(ref => {
        const source = gameData.sources.find(s => s.id === ref.sourceId);
        const fragmentText = ref.textFragment || ref.section;
        const url = source?.url && fragmentText
          ? `${source.url}#:~:text=${encodeURIComponent(fragmentText)}`
          : source?.url;
        return {
          sourceName: source?.name || ref.sourceId,
          section: ref.section,
          lines: ref.lines,
          url,
        };
      });
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// --- get_hint ---
server.tool(
  'get_hint',
  'Get a specific hint by number (1-based) for a situation. Use this to progressively reveal hints.',
  {
    game: z.string().describe('Game slug'),
    area: z.string().describe('Area ID'),
    situation: z.string().describe('Situation ID'),
    hint_number: z.number().int().min(1).describe('Hint number (1 = vaguest, 3 = most specific)'),
  },
  async ({ game: gameSlug, area: areaId, situation: situationId, hint_number }) => {
    const gameData = getGame(gameSlug);
    if (!gameData) return { content: [{ type: 'text', text: `Game not found: ${gameSlug}` }], isError: true };

    const area = gameData.areas?.find(a => a.id === areaId);
    if (!area) return { content: [{ type: 'text', text: `Area not found: ${areaId}` }], isError: true };

    const situation = area.situations?.find(s => s.id === situationId);
    if (!situation) return { content: [{ type: 'text', text: `Situation not found: ${situationId}` }], isError: true };

    const hints = situation.hints || [];
    if (hint_number > hints.length) {
      return { content: [{ type: 'text', text: `Only ${hints.length} hints available for this situation.` }], isError: true };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          game: gameData.title,
          area: area.name,
          situation: situation.title,
          hintNumber: hint_number,
          totalHints: hints.length,
          hint: hints[hint_number - 1],
          hasMore: hint_number < hints.length,
        }, null, 2),
      }],
    };
  }
);

// --- search_hints ---
server.tool(
  'search_hints',
  'Fuzzy search across all games for situations matching a query. Searches titles, tags, context, area names, and game titles.',
  {
    query: z.string().min(2).describe('Search query (e.g. "boss key", "wall jump", "how to defeat kraid")'),
    game: z.string().optional().describe('Optional: limit search to a specific game slug'),
    limit: z.number().int().min(1).max(50).optional().default(10).describe('Max results to return'),
  },
  async ({ query, game: gameSlug, limit }) => {
    let results;
    if (gameSlug) {
      const gameData = getGame(gameSlug);
      if (!gameData) return { content: [{ type: 'text', text: `Game not found: ${gameSlug}` }], isError: true };
      const index = new Fuse(flattenSituations([gameData]), {
        threshold: 0.4,
        minMatchCharLength: 2,
        includeScore: true,
        keys: [
          { name: 'title', weight: 2 },
          { name: 'tags', weight: 1.5 },
          { name: 'context', weight: 1.2 },
          { name: 'areaName', weight: 1 },
        ],
      });
      results = index.search(query);
    } else {
      results = getSearchIndex().search(query);
    }

    const mapped = results.slice(0, limit).map(r => ({
      game: r.item.gameTitle,
      gameSlug: r.item.gameSlug,
      area: r.item.areaName,
      areaId: r.item.areaId,
      situation: r.item.title,
      situationId: r.item.situationId,
      context: r.item.context,
      tags: r.item.tags,
      relevance: Math.round((1 - r.score) * 100) + '%',
    }));

    return {
      content: [{
        type: 'text',
        text: mapped.length > 0
          ? JSON.stringify(mapped, null, 2)
          : `No results found for "${query}"`,
      }],
    };
  }
);

// --- get_game_stats ---
server.tool(
  'get_game_stats',
  'Get detailed statistics about a game: coverage breakdown by area, tag frequency, hint count distribution, source info.',
  { slug: z.string().describe('Game slug') },
  async ({ slug }) => {
    const game = getGame(slug);
    if (!game) return { content: [{ type: 'text', text: `Game not found: ${slug}` }], isError: true };

    const tagFrequency = {};
    let totalHints = 0;
    let totalSituations = 0;
    let situationsWithSourceRefs = 0;

    const areaBreakdown = (game.areas || []).map(a => {
      const sitCount = a.situations?.length || 0;
      totalSituations += sitCount;
      for (const s of a.situations || []) {
        totalHints += s.hints?.length || 0;
        if (s.sourceRefs?.length > 0) situationsWithSourceRefs++;
        for (const tag of s.tags || []) {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        }
      }
      return { area: a.name, id: a.id, situations: sitCount };
    });

    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    const total = game.totalEstimatedSituations || 0;
    const coverage = total > 0 ? Math.round((totalSituations / total) * 100) : null;

    const result = {
      title: game.title,
      year: game.year,
      coverage: coverage !== null ? `${coverage}% (${totalSituations}/${total})` : `${totalSituations} situations`,
      totalHints,
      avgHintsPerSituation: totalSituations > 0 ? +(totalHints / totalSituations).toFixed(1) : 0,
      situationsWithSourceRefs: `${situationsWithSourceRefs}/${totalSituations}`,
      quality: game.quality || 'unrated',
      sources: game.sources || [],
      areaBreakdown,
      topTags,
    };

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// --- browse_area ---
server.tool(
  'browse_area',
  'List all situations in a game area with their titles, tags, and hint counts.',
  {
    game: z.string().describe('Game slug'),
    area: z.string().describe('Area ID'),
  },
  async ({ game: gameSlug, area: areaId }) => {
    const gameData = getGame(gameSlug);
    if (!gameData) return { content: [{ type: 'text', text: `Game not found: ${gameSlug}` }], isError: true };

    const area = gameData.areas?.find(a => a.id === areaId);
    if (!area) return { content: [{ type: 'text', text: `Area not found: ${areaId}` }], isError: true };

    const result = {
      game: gameData.title,
      area: area.name,
      situations: (area.situations || []).map(s => ({
        id: s.id,
        title: s.title,
        context: s.context,
        tags: s.tags,
        hintCount: s.hints?.length || 0,
      })),
    };

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// --- find_by_tag ---
server.tool(
  'find_by_tag',
  'Find all situations that have a specific tag. Useful for finding all bosses, all puzzles, etc.',
  {
    tag: z.string().describe('Tag to search for (e.g. "boss", "puzzle", "late-game", "sequence-break")'),
    game: z.string().optional().describe('Optional: limit to a specific game'),
  },
  async ({ tag, game: gameSlug }) => {
    const games = gameSlug ? [getGame(gameSlug)].filter(Boolean) : getAllGames();
    if (gameSlug && games.length === 0) {
      return { content: [{ type: 'text', text: `Game not found: ${gameSlug}` }], isError: true };
    }

    const matches = [];
    for (const game of games) {
      for (const area of game.areas || []) {
        for (const s of area.situations || []) {
          if (s.tags?.includes(tag)) {
            matches.push({
              game: game.title,
              gameSlug: game.slug,
              area: area.name,
              areaId: area.id,
              situation: s.title,
              situationId: s.id,
              tags: s.tags,
            });
          }
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: matches.length > 0
          ? JSON.stringify(matches, null, 2)
          : `No situations found with tag "${tag}"`,
      }],
    };
  }
);

// --- list_all_tags ---
server.tool(
  'list_all_tags',
  'List all unique tags used across all games (or a specific game) with usage counts.',
  {
    game: z.string().optional().describe('Optional: limit to a specific game slug'),
  },
  async ({ game: gameSlug }) => {
    const games = gameSlug ? [getGame(gameSlug)].filter(Boolean) : getAllGames();
    const freq = {};
    for (const game of games) {
      for (const area of game.areas || []) {
        for (const s of area.situations || []) {
          for (const tag of s.tags || []) {
            freq[tag] = (freq[tag] || 0) + 1;
          }
        }
      }
    }
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));

    return { content: [{ type: 'text', text: JSON.stringify(sorted, null, 2) }] };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
