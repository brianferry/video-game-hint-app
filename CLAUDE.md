# CLAUDE.md

## Project Overview

Retro Game Hints is a DIY progressive hint system for classic video games. Users find a game guide online, save it locally, and use the import tools to generate structured hint data. The app renders hints with progressive reveal (vague → specific → full answer).

**Super Metroid** is the included demo game. Users add their own games.

## Key Commands

```bash
npm run dev          # Dev server at localhost:5173
npm run build        # Production build → dist/index.html (single file)
npm run test         # Run all tests (vitest + playwright)
npm run test:unit    # Unit tests only
npm run test:e2e     # E2E tests only
npm run mcp          # Start MCP server for AI assistants
```

## Architecture

- **Frontend:** Svelte 5 + Vite 8, client-side only, no server at runtime
- **Data:** Game JSON files in `src/data/games/<era>/<slug>.json`, eagerly bundled at build time
- **Search:** Fuse.js fuzzy search, 100% client-side
- **Build output:** Single self-contained HTML file via `vite-plugin-singlefile`
- **MCP server:** `tools/mcp-server.js` — exposes hint database as MCP tools for AI assistants

## File Layout

- `src/views/` — Svelte components: Home, Game, Area, Situation
- `src/lib/` — data-loader.js, search.js, progress.js, markdown.js
- `src/data/games/` — Game JSON files organized by era (1990s/, etc.)
- `tools/` — mcp-server.js
- `tests/unit/` — Vitest tests for lib modules
- `tests/e2e/` — Playwright navigation + a11y tests
- `.claude/agents/` — game-importer, hint-auditor, guide-rater agents

## Hint Rules

All game data must follow `HINT_RULES.md`. Key rules:
- Areas and situations in game-progression order with `order` fields
- 5-8 descriptive tags per situation (progression phase, location, items, encounter type)
- Context field: `"[Character], [location], [what they're stuck on]"`
- Hints: 1-3 per situation, progressive revelation, `[SPOILER: ...]` tags on reveals
- Source attribution linking back to the original guide

## Agent Workflow

Three agents handle the import-review-rate cycle:
1. **game-importer** — generates game JSON from FAQ files
2. **hint-auditor** — reviews for compliance with HINT_RULES.md (read-only)
3. **guide-rater** — assigns 1-5 star quality rating

## Testing Notes

- Unit tests use vitest with jsdom environment
- E2E tests use Playwright against a Vite dev server on port 5178
- A11y tests use axe-core via @axe-core/playwright
- All test references use Super Metroid (the demo game)
