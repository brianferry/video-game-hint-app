# Hint App — Technical Specification

## Build & Deployment

### Build Target
- **Output:** Single self-contained HTML file (`dist/index.html`)
- **Bundled assets:** All JS and CSS embedded inline in HTML
- **Rationale:** Offline-first, single file to distribute/deploy
- **Build command:** `npm run build` → outputs `dist/index.html`

### Deployment
- **Target:** GitHub Pages (static hosting)
- **Workflow:** `.github/workflows/deploy.yml`
- **Trigger:** Push to `main` branch → auto-build and deploy to `gh-pages`
- **URL:** `https://username.github.io/hint-app/`

### Development
- **Dev server:** `npm run dev` → runs on `http://localhost:5173`
- **HMR:** Hot module replacement enabled
- **Watch mode:** Auto-rebuild on file changes

---

## Dependencies

### Production (bundled)
```json
{
  "svelte": "^5.0.0",
  "fuse.js": "^7.0.0",
  "marked": "^11.0.0"
}
```

### Dev
```json
{
  "vite": "^8.0.0",
  "@vitejs/plugin-svelte": "^3.0.0",
  "vitest": "^1.0.0",
  "@testing-library/svelte": "^4.0.0",
  "@playwright/test": "^1.40.0",
  "axe-core": "^4.8.0",
  "@axe-core/playwright": "^4.8.0"
}
```

---

## Architecture & Components

### App.svelte (Root)
**State:**
```svelte
$state {
  currentView: 'home' | 'game' | 'area' | 'situation',
  routeParams: { game?: string, area?: string, situation?: string },
  theme: 'light' | 'dark',
  searchQuery: string,
  searchResults: [] | null,  // null = no search active
  loadedGames: Map<slug, GameData>,  // cache
  error: string | null
}
```

**Responsibilities:**
- Parse URL query params on mount
- Maintain theme preference (toggle button)
- Delegate data loading to child views
- Show errors if game/area/situation not found
- Render appropriate view component

### Game.svelte
**Props:**
```svelte
export let gameSlug: string;
export let onSelectArea: (areaId) => void;
```

**Data flow:**
1. `$derived gameData = await loadGame(gameSlug)` (once-per-session)
2. Build search index on first load
3. Setup game-scoped search (key: title, tags)
4. Render area list with search bar

### Situation.svelte
**Props:**
```svelte
export let gameSlug: string;
export let areaId: string;
export let situationId: string;
```

**State:**
```svelte
$state revealedCount = 0;  // Number of hints user has clicked to reveal
```

**Rendering:**
- Breadcrumb: `<a href="...">Game</a> › <a href="...">Area</a> › Situation`
- If no hints: show "Hints coming soon" placeholder
- If hints exist: render 1-3 cards:
  ```
  [ Hint 1 ] (revealed, always visible)
  
  [Show hint 2] (button, disabled until hint 1 clicked)
  
  [Show hint 3] (button, disabled)
  ```
- On button click: increment `revealedCount`, save to localStorage
- Render revealed hints with markdown + spoiler tags

---

## Data Loading & Caching

### Parent (App.svelte) Loads
- `src/data/index.json` at mount (game manifest)

### Children Load on Demand
- `src/data/[year]/[game-slug].json` when user clicks game
- Cached in `loadedGames` map (session-level cache)
- If fetch fails: try to restore from sessionStorage fallback
- If no fallback: show error, offer retry button

### Lazy-loading Function (`lib/data-loader.js`)
```javascript
export async function loadGame(slug, fallbackCache = null) {
  // Check session cache first
  if (sessionGameCache.has(slug)) return sessionGameCache.get(slug);
  
  try {
    const response = await fetch(`/data/[year-inferred]/${slug}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // Validate schema
    validateGameSchema(data);
    
    sessionGameCache.set(slug, data);
    return data;
  } catch (e) {
    if (fallbackCache && fallbackCache[slug]) {
      // Restore from sessionStorage
      return fallbackCache[slug];
    }
    throw new Error(`Failed to load game ${slug}: ${e.message}`);
  }
}
```

---

## Search Implementation

### Global Search (Home view)
**Key:** All games, all situations
**Fields indexed:** `game.title`, `title`, `area.name`, `tags`, `area.id`

### Game-Scoped Search (Game view)
**Key:** Current game only
**Fields indexed:** `title`, `tags`

### Fuse.js Configuration (`lib/search.js`)
```javascript
const fuseOptions = {
  threshold: 0.4,           // Lenient (tolerate typos)
  minMatchCharLength: 2,    // Avoid noise
  includeScore: true,       // Sort by relevance
  keys: [
    { name: 'title', weight: 2 },
    { name: 'tags', weight: 1.5 },
    { name: 'area.name', weight: 1 },
    { name: 'game.title', weight: 1 }
  ]
};
```

**Search Function:**
```javascript
export function search(query, gameData = null) {
  if (gameData) {
    // Game-scoped search
    return fuse.search(query).map(result => ({
      ...result.item,
      gameSlug: gameData.slug,
      breadcrumb: `${gameData.title} › ${result.item.area.name}`
    }));
  } else {
    // Global search across all games
    return fuse.search(query).map(result => ({
      ...result.item,
      breadcrumb: `${result.item.game.title} › ${result.item.area.name}`
    }));
  }
}
```

**Debounce:** 300ms (text input → wait 300ms → search)

---

## Markdown & Spoiler Rendering

### Pipeline
1. **Process spoilers first:** Convert `[SPOILER: text]` → `<details><summary>Show spoiler</summary>text</details>`
2. **Then markdown:** Feed result to `marked` for **bold**, *italic*, lists, links

### Spoiler Processor (`lib/markdown.js`)
```javascript
export function processSpoilers(text) {
  return text.replace(
    /\[SPOILER:\s*(.+?)\]/g,
    '<details class="spoiler"><summary>Show spoiler</summary>$1</details>'
  );
}
```

### Markdown Renderer
```javascript
import { marked } from 'marked';

export function renderMarkdown(text) {
  const withSpoilers = processSpoilers(text);
  return marked(withSpoilers, {
    breaks: true,
    gfm: true
  });
}
```

### CSS for Spoilers
```css
details.spoiler {
  cursor: pointer;
  padding: 0.5rem;
  border-left: 3px solid var(--color-accent);
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

details.spoiler summary {
  user-select: none;
  font-weight: 600;
  color: var(--color-text-secondary);
}

details.spoiler[open] summary {
  margin-bottom: 0.5rem;
}
```

---

## localStorage Schema

### Theme
```json
{
  "theme": "light" | "dark"
}
```

### Hint Progress (per situation)
```json
{
  "hint-progress/super-metroid/ceres-station/ceres-ridley": {
    "revealedCount": 2,
    "viewedAt": "2026-04-05T14:32:00Z"
  }
}
```

### Analytics (usage tracking)
```json
{
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

### Helper Functions (`lib/progress.js`)
```javascript
export function getProgress(gameSlug, areaId, situationId) {
  const key = `hint-progress/${gameSlug}/${areaId}/${situationId}`;
  return JSON.parse(localStorage.getItem(key)) || { revealedCount: 0 };
}

export function saveProgress(gameSlug, areaId, situationId, revealedCount) {
  const key = `hint-progress/${gameSlug}/${areaId}/${situationId}`;
  localStorage.setItem(key, JSON.stringify({
    revealedCount,
    viewedAt: new Date().toISOString()
  }));
}

export function trackView(gameSlug, areaId, situationId) {
  const key = `analytics:${gameSlug}/${areaId}/${situationId}`;
  const current = JSON.parse(localStorage.getItem(key)) || { viewCount: 0 };
  localStorage.setItem(key, JSON.stringify({
    viewCount: current.viewCount + 1,
    lastViewed: new Date().toISOString()
  }));
}
```

---

## MCP Server (`tools/mcp-server.js`)

Exposes the hint database as MCP tools so AI assistants can browse games, search for hints, and reveal hints progressively through natural conversation.

```bash
npm run mcp
```

Tools provided: `list_games`, `get_game`, `get_situation`, `get_hint`, `search_hints`, `get_game_stats`, `browse_area`, `find_by_tag`, `list_all_tags`.

---

## File Organization by Year

```
src/data/games/
├── 1990s/
│   └── super-metroid.json    # Demo game (included)
├── 2000s/                    # Add your own games here
│   └── ...
```

Game data is eagerly loaded at build time via `import.meta.glob('../data/games/**/*.json')`. The data loader builds a registry keyed by slug — no separate index file needed.

---

## Testing

### Playwright E2E Tests (`tests/e2e/`)
```javascript
test('loads home, game list visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-test="game-list"]')).toBeVisible();
});

test('click game → loads area list', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-test="game-card-super-metroid"]').click();
  await expect(page).toHaveURL(/game=super-metroid/);
});
```

### Accessibility Tests
```javascript
test('WCAG 2.1 AA compliance', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Vitest Unit Tests (`tests/unit/`)
```javascript
test('search finds by tag', () => {
  const results = search('kraid', gameData);
  expect(results.length).toBeGreaterThan(0);
});

test('saves and retrieves progress', () => {
  saveProgress('super-metroid', 'ceres-station', 'ceres-ridley', 2);
  const progress = getProgress('super-metroid', 'ceres-station', 'ceres-ridley');
  expect(progress.revealedCount).toBe(2);
});
```

---

## CSS Architecture

### Tokens (in `styles.css`)
```css
:root {
  --color-text: #000;
  --color-bg: #fff;
  --color-bg-secondary: #f5f5f5;
  --color-accent: #0066cc;
  --color-danger: #d32f2f;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  
  --breakpoint-tablet: 640px;
  --breakpoint-desktop: 1024px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #fff;
    --color-bg: #1a1a1a;
    --color-bg-secondary: #2d2d2d;
    --color-accent: #66b3ff;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.5;
}
```

### Mobile-first Strategy
- Base styles for mobile (375px)
- Tablet breakpoint (640px): increase spacing, wider cards
- Desktop breakpoint (1024px): multi-column layouts, sidebars

---

## Performance Considerations

- **Lazy load games:** Only load game JSON when clicked
- **Session cache:** Keep loaded games in memory (single session)
- **Debounce search:** 300ms to avoid re-indexing on every keystroke
- **Single HTML build:** Serve one file, browser caches it
- **No external CDNs:** Everything embedded for offline reliability

---

## CI/CD

### GitHub Actions Workflow (`.github/workflows/build.yml`)
1. **On:** Push to `main` branch
2. **Build:** `npm run build`
3. **Test:** `npm run test` (Playwright + Vitest)
4. **Deploy:** Push `dist/index.html` to `gh-pages` branch

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run test
      - run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```
