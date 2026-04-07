# Retro Game Hint App — Design Document

## Overview
A DIY progressive hint system for classic video games. Users find a game guide online, save it locally, then use the included import pipeline to generate a structured hint database. The app renders hints in a **game → area → situation** hierarchy with fuzzy search and progressive reveal (vague → specific → full answer).

**Super Metroid** is included as a fully worked demo. Users add their own games by importing guides through the CLI tool or the Claude Code agentic workflow.

**Key principle:** Zero AI at runtime. The live app is pure client-side. AI is used only once — offline — to structure raw walkthrough text into the hint database.

---

## Architecture

### Runtime App (`src/`)
- **Svelte 5 + Vite** frontend, zero dependencies on a server
- String-based routing (5 views) — matches `energy-router` pattern
- Client-side fuzzy search (Fuse.js)
- localStorage for hint progress persistence
- **No AI, no external API calls**

### Import Pipeline (`tools/import-faq.js`)
- One-time CLI script: takes a GameFAQs `.txt` file, outputs structured JSON
- Calls Claude API (claude-haiku-4-5) to parse FAQ structure + generate 3 progressive hints per situation
- Validates JSON schema, writes to `src/data/[game-slug].json`
- Requires `ANTHROPIC_API_KEY` environment variable

---

## Data Schema

Each game file: `src/data/games/<era>/<slug>.json`

```json
{
  "slug": "super-metroid",
  "title": "Super Metroid",
  "year": 1994,
  "era": "1990s",
  "totalEstimatedSituations": 55,
  "importedAt": "2026-04-06T00:00:00Z",
  "importSource": {
    "file": "39375.txt",
    "url": "https://gamefaqs.gamespot.com/snes/588741-super-metroid/faqs/39375"
  },
  "sources": [
    {
      "id": "src-1",
      "name": "Foxhound3857's Strategy Guide/FAQ v1.3",
      "url": "https://gamefaqs.gamespot.com/snes/588741-super-metroid/faqs/39375",
      "author": "Foxhound3857",
      "platform": "GameFAQs"
    }
  ],
  "quality": null,
  "areas": [
    {
      "id": "ceres-station",
      "name": "Ceres Station",
      "order": 1,
      "situations": [
        {
          "id": "ceres-ridley",
          "title": "Fighting Ridley at Ceres Station",
          "order": 1,
          "context": "Samus, Ceres research lab, Ridley appeared and grabbed the Metroid",
          "tags": ["early-game", "ceres-station", "boss", "ridley", "tutorial-area", "power-beam-only"],
          "hints": [
            "You don't actually have to win this fight — there are two ways to handle it.",
            "You can either shoot **Ridley** until he drops the Metroid, or let him damage you down to low energy and he'll leave on his own.",
            "Stay on the left side, wall jump to avoid rams. [SPOILER: The outcome is the same either way — Ridley takes the Metroid and flies off.]"
          ],
          "sourceRefs": [
            { "sourceId": "src-1", "section": "4.1: Ceres Station — Ridley Boss", "lines": "957-996" }
          ]
        }
      ]
    }
  ]
}
```

**Notes:**
- `hints` array: 1-3 entries (flexible, not always exactly 3)
- Hints support **markdown** (bold, italic, lists, links)
- `[SPOILER: ...]` tags can be toggled visible/hidden within a hint
- `importedAt`: ISO timestamp of when this game was last imported
- `importSource`: metadata about where the FAQ came from (filename, optional URL)
- `sources`: array of all guides/FAQs used to create this game's hints (displayed at bottom of Game view)
- `sourceRefs` on each situation: links back to the specific source, section, and line range
- `quality`: 1-5 star rating with per-dimension scores, assigned by the guide-rater agent
- `order` on areas and situations: global progression order (1-based)
- `context`: one-line player state description, shown as subtitle
- `tags`: 5-8 descriptive tags per situation for searchability
```

Game data is eagerly loaded at build time via `import.meta.glob` — no separate index file needed. The data loader (`src/lib/data-loader.js`) scans `src/data/games/**/*.json` and builds a registry keyed by slug.

---

## Views & Routing

| View | Route | Props | Purpose |
|------|-------|-------|---------|
| `Home.svelte` | default | none | Game list (with area/situation counts), global search bar |
| `Game.svelte` | `?game=slug` | game slug | List areas in selected game, game-scoped search |
| `Area.svelte` | `?game=slug&area=id` | game slug, area id | List situations in that area |
| `Situation.svelte` | `?game=slug&area=id&situation=id` | all three | Breadcrumb nav + progressive hint reveal |

**State management:** `$state` in `App.svelte` (Svelte 5 runes), derives URL params from querystring.

### Home View
- Displays all games from `src/data/index.json`
- Each game card shows: **Title (Year) • N areas • M situations**
- Global search bar filters across all games/areas/situations
- Click a game → navigate to Game view

### Game View
- Shows all areas in the selected game
- Search bar at top searches *only this game*
- Click an area → navigate to Area view
- Back button or breadcrumb to return to Home

### Area View
- Shows all situations in the selected area
- Lists each situation with its title and tags
- Click a situation → navigate to Situation view
- Breadcrumb at top shows: `Game › Area`

### Situation View
- **Breadcrumb (clickable):** `Game › Area › Situation`
- If no hints exist: show "Hints coming soon" placeholder
- Otherwise: show 1-3 hint cards, each initially collapsed
- Each hint card has: "Show hint N" button (disabled until previous revealed)
- Click to reveal → shows hint text with markdown rendered
- No collapse/reset—once revealed, stays visible
- Spoiler tags (`[SPOILER: ...]`) render as toggleable inline spoilers

---

## Key Features

### Progressive Hint Reveal
- Each situation has **1–3 hints** (vague → specific → full answer)
- Hints load hidden; "Show hint N" buttons unlock them in order
- Can't skip ahead (UX: disabled button prevents advancing to hint 3 without revealing hint 2)
- Once revealed, hints stay visible (no collapse)
- localStorage key: `hint-progress/${game-slug}/${area-id}/${situation-id}` → `{ revealedCount: 2, viewedAt: "2026-04-05T..." }`

### Hint Content
- Hints support **markdown formatting** (bold, italic, lists, links)
- `[SPOILER: text]` inline tags render as toggleable spoiler blocks (click to show/hide)
- Example: "The key is [SPOILER: in the treasure chest] to the north"

### Fuzzy Search (Fuse.js)
- **Global search (Home view):** Searches all games, areas, situations
- **Game-scoped search (inside Game view):** Searches only the current game
- Search fields: situation title, tags, area name, game title (when global)
- Case-insensitive, lenient fuzzy matching (tolerates typos)
- 300ms debounce on keystroke
- Results show breadcrumb: `Game › Area › Situation title`
- Click result → navigate directly to that situation (all hints collapsed)

### Themes & Accessibility
- Light/dark theme toggle in header
- CSS custom properties (matching `energy-router` pattern)
- Respects `prefers-color-scheme` on first load, but user can override
- Theme preference saved to localStorage
- Mobile-first responsive design with touch-friendly targets

### Local Analytics
- Track most-viewed situations in localStorage
- Key: `analytics` → `{ situations: { "slug/area/situation": { viewCount: 5, lastViewed: "..." } } }`
- No external data collection; all local

---

## File Structure

```
hint-app/
├── src/
│   ├── App.svelte              # Root, routing logic, theme toggle
│   ├── main.js                 # Vite entry
│   ├── styles.css              # CSS tokens + base styles
│   ├── views/
│   │   ├── Home.svelte         # Game list + global search bar
│   │   ├── Game.svelte         # Area list + game-scoped search
│   │   ├── Area.svelte         # Situation list
│   │   └── Situation.svelte    # Breadcrumb + progressive hint reveal
│   ├── lib/
│   │   ├── search.js           # Fuse.js setup, indexing, search logic
│   │   ├── progress.js         # localStorage helpers (hint progress, analytics)
│   │   ├── markdown.js         # marked setup, spoiler tag pre-processor
│   │   └── data-loader.js      # Eager-load game JSON files at build time
│   └── data/
│       └── games/
│           └── 1990s/
│               └── super-metroid.json  # Demo game (included)
├── tools/
│   └── mcp-server.js           # MCP server for AI assistants
├── package.json
├── vite.config.js
├── README.md                   # User-facing readme (install, usage, contribute)
└── DESIGN.md                   # This file (architecture + decisions)
```

---

## Adding Games

Users create their own game JSON files following the schema above and `HINT_RULES.md`. The workflow:

1. Find a walkthrough/FAQ for the game and save it as a `.txt` file
2. Use the Claude Code agentic workflow (game-importer → hint-auditor → guide-rater) to generate, review, and rate the hint data
3. Or hand-write the JSON following the schema and `HINT_RULES.md`
4. Place the file in `src/data/games/<era>/<slug>.json`
5. Rebuild — the new game appears automatically

---

## Stack & Dependencies

### Frontend (Bundled in app)
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Svelte | 5.x | UI framework | Runes ($state, $derived), reactivity |
| Vite | 8.x | Build + dev server | SvelteKit not needed (simple routing) |
| Fuse.js | 7.x | Fuzzy search | 100% client-side, 0.5–1.0 KB with default config |
| marked | 15.x | Markdown rendering | Render hints as markdown with sanitization |

### Local Storage Schema
```json
{
  "theme": "light|dark",
  "hint-progress": {
    "super-metroid/ceres-station/ceres-ridley": {
      "revealedCount": 2,
      "viewedAt": "2026-04-05T14:32:00Z"
    }
  },
  "analytics": {
    "situations": {
      "super-metroid/ceres-station/ceres-ridley": {
        "viewCount": 5,
        "lastViewed": "2026-04-05T14:32:00Z"
      }
    }
  }
}
```

---

## Architecture Details

### Data Loading Strategy
- All game JSON files in `src/data/games/` are **eagerly imported at build time** via `import.meta.glob`
- The data loader builds a registry keyed by slug on first access
- No runtime fetching — everything is bundled into the single HTML file
- This keeps the app fully offline-capable

### Fuse.js Configuration
- **Threshold:** 0.4 (lenient fuzzy matching, tolerates typos)
- **Keys to search:** `["title", "tags", "area.name", "game.title"]` (globally); `["title", "tags"]` (per-game)
- **Include score:** true (for sorting relevance)
- **Min match length:** 2 (avoid noise from single-character matches)

### Mobile-First Strategy
- Base styles designed for mobile (small screens, touch-friendly)
- Viewport meta tag: `width=device-width, initial-scale=1.0`
- Touch targets: minimum 44×44px
- Responsive breakpoints: 640px (tablet), 1024px (desktop)
- No mobile-specific views; same layout scales gracefully

### Markdown Rendering
- Use `marked` library with default options
- **Sanitize output** (no arbitrary HTML injection)
- Support: bold (`**text**`), italic (`*text*`), lists, links
- Spoiler tags (`[SPOILER: ...]`) are pre-processed before markdown rendering
- Inline spoilers render as `<details><summary>Show spoiler</summary>text</details>` (native HTML toggle)

---

## Testing & Verification

### Before release:
1. **Load app**: `npm run dev` → app loads, game list displays with counts
2. **Browse**: Click game → areas → situations → hints reveal in order (can't skip)
3. **Search**: 
   - Global search on Home → results from multiple games
   - Search inside Game view → results from that game only
   - Click result → navigates to situation (all hints collapsed)
4. **Progress**: Refresh page → hint reveal state is restored from localStorage
5. **Theme**: Toggle light/dark → persists across reload
6. **Markdown**: Hints render bold, lists, links correctly
7. **Spoilers**: `[SPOILER: ...]` tags render as toggleable blocks
8. **Analytics**: View multiple situations, reload → "most viewed" is tracked
9. **Import**: `node tools/import-faq.js --dry-run` → outputs valid JSON to console
10. **Offline**: Disable network → app still works (all data is local)

### E2E testing (future):
- Playwright tests similar to `energy-router` setup
- Smoke tests: load, navigate views, search, lazy-load games
- a11y tests: keyboard nav, ARIA labels, focus indicators, reduced-motion
- Mobile layout tests at 375px width

---

## Demo Data

### Included Demo: Super Metroid
The app ships with a complete Super Metroid hint database as the working demo:
```
src/data/games/1990s/super-metroid.json
```

This includes 10 areas with 55 situations, showing:
- Full game-progression ordering with `order` fields
- Various hint lengths (1–3 per situation)
- Markdown formatting (bold, lists)
- Spoiler tag usage (`[SPOILER: ...]`)
- Rich tagging (5-8 tags per situation)
- Source attribution back to the original FAQ

**Purpose:** Users see the app working immediately, understand the data format, and can follow the README to add their own games.

### Adding Your Own Games
1. Find a walkthrough/FAQ for your game online and save it as a `.txt` file
2. Run: `node tools/import-faq.js --file faq.txt --title "Game Title" --year 1999 --game game-slug`
3. Review and refine the generated JSON (see HINT_RULES.md)
4. Reload the app → your game appears in the list

---

## State Management (Svelte 5)

### App.svelte (Root)
- `$state currentView`: "home" | "game" | "area" | "situation"
- `$state routeParams`: `{ game?, area?, situation? }`
- Derived: `$derived allGames = loadedGames` (filtered for current query)
- Derived: `$derived searchResults = ...` (from Fuse.js index)

### Lib Modules
- `progress.js`: Pure functions to read/write localStorage (`getProgress`, `saveProgress`, `trackView`)
- `search.js`: `buildIndex()`, `search(query, gameSlug?)` → results
- `data-loader.js`: `loadGame(slug)` → cached Promise (lazy-load)
- `markdown.js`: `processSpoilers(text)`, `renderMarkdown(text)` → HTML

No global stores needed (unlike energy-router) because routing is simple string-based.

---

## Future Ideas

- **Bookmarks**: Star favorite hints, view a "bookmarked" list
- **Wiki links**: Hyperlink situations to external game wikis
- **Difficulty tags**: Filter by difficulty level (easy / medium / hard)
- **Import from other sources**: GameSpot, IGN, user-submitted hints
- **Multiplayer hints**: Collaborative hint writing UI
- **Progress stats**: "You've seen X% of hints across all games"
- **Hint history**: Revisit recently viewed situations
- **Export data**: Backup or share hint collections
