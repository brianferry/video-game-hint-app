# Retro Game Hints

A spoiler-free, progressive hint system for classic video games. Players browse hints by **game > area > situation** and reveal them one at a time — from vague nudge to full answer — so they only see as much help as they need.

**Super Metroid** is included as a fully worked demo. The real power is the tooling: you bring your own game guide, and the import pipeline + AI generates a structured hint database from it.

## Live Demo

[View the demo on GitHub Pages](https://brianferry.github.io/video-game-hint-app/)

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  1. Find a walkthrough/FAQ for your game online          │
│     (e.g. GameFAQs, IGN, fan wikis)                     │
│                                                          │
│  2. Save the guide text to a local file                  │
│     e.g. my-game-faq.txt                                 │
│                                                          │
│  3. Use the Claude Code agentic workflow to generate     │
│     structured hint JSON from the guide                  │
│     (or hand-write the JSON following HINT_RULES.md)     │
│                                                          │
│  4. Place the JSON in src/data/games/<era>/<slug>.json   │
│     and rebuild — your game appears in the app           │
└──────────────────────────────────────────────────────────┘
```

**The live app has zero AI — it's pure client-side HTML/JS.** AI is only used offline (via the Claude Code agents) to generate the hint data from your source guide.

## Quick Start

```bash
# Install dependencies
npm install

# Run the dev server (includes Super Metroid demo)
npm run dev

# Run tests
npm test

# Build for production (single HTML file)
npm run build
```

## Adding Your Own Game

### Step 1: Get a guide

Find a text walkthrough for your game. Good sources:
- [GameFAQs](https://gamefaqs.gamespot.com/) — largest archive of text guides
- Fan wikis, strategy sites, or your own notes

Save the guide as a `.txt` file on your machine.

### Step 2: Generate the hint JSON

Use the Claude Code **game-importer** agent (see [Agentic Workflow](#agentic-workflow-claude-code) below) to generate structured hint JSON from your guide. Or hand-write the JSON following the schema in [HINT_RULES.md](HINT_RULES.md).

Place the resulting file in `src/data/games/<era>/<slug>.json` (e.g. `src/data/games/1990s/my-game.json`).

### Step 3: Review and refine

For the best results, review the generated JSON and tweak:
- **Hint quality** — Is hint 1 truly vague? Does hint 3 have `[SPOILER: ...]` tags?
- **Tags** — Are there 5-8 descriptive tags per situation?
- **Ordering** — Are areas and situations in game-progression order?

Use the **hint-auditor** agent to check for compliance, and the **guide-rater** agent to assign a quality rating.

### Step 4: Run the app

```bash
npm run dev
```

Your new game appears in the game list. Build with `npm run build` to get a single `dist/index.html` you can host anywhere.

## Agentic Workflow (Claude Code)

If you're using [Claude Code](https://claude.com/claude-code), the project includes three specialized agents that automate the import-review-rate cycle:

### 1. `game-importer` agent

Generates game hint JSON from a FAQ source file. It reads `HINT_RULES.md`, understands game-specific conventions, and produces well-structured output.

**Invoke:** Ask Claude Code to import a game, or run the `game-importer` agent directly.

```
"Import hints for My Game from my-game-faq.txt"
```

### 2. `hint-auditor` agent

Reviews a game JSON file for compliance with `HINT_RULES.md`. It checks ordering, tag quality, context fields, hint progression, and source attribution. It reports issues but does not edit files.

**Invoke after import:**

```
"Audit src/data/games/1990s/my-game.json"
```

### 3. `guide-rater` agent

Assigns a 1-5 star quality rating to a game's hint guide. Evaluates coverage, ordering, tags, context, hint quality, and completeness. Writes the rating directly into the game JSON.

**Invoke after audit passes:**

```
"Rate the guide quality for my-game"
```

### Typical workflow

```
FAQ file → game-importer → hint-auditor → fix issues → hint-auditor → guide-rater
```

### MCP Server

The project also includes an MCP server (`tools/mcp-server.js`) that exposes the hint database as tools for AI assistants. This lets you browse, search, and progressively reveal hints through natural conversation.

```bash
npm run mcp
```

## Game JSON Format

Each game is a single JSON file in `src/data/games/<era>/<slug>.json`. Here's the expected structure:

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
      "url": "https://gamefaqs.gamespot.com/...",
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
          "tags": [
            "early-game",
            "ceres-station",
            "boss",
            "ridley",
            "tutorial-area",
            "power-beam-only"
          ],
          "hints": [
            "You don't actually have to win this fight — there are two ways to handle it.",
            "You can either shoot **Ridley** until he drops the Metroid, or let him damage you down to low energy and he'll leave on his own.",
            "Stay on the left side, wall jump to avoid rams. [SPOILER: The outcome is the same either way — Ridley takes the Metroid and flies off.]"
          ],
          "sourceRefs": [
            {
              "sourceId": "src-1",
              "section": "4.1: Ceres Station — Ridley Boss",
              "lines": "957-996"
            }
          ]
        }
      ]
    }
  ]
}
```

### Key fields

| Field | Description |
|-------|-------------|
| `slug` | URL-safe game identifier (kebab-case) |
| `era` | Decade folder: `1980s`, `1990s`, `2000s` |
| `totalEstimatedSituations` | Estimated hint-worthy moments in the full game |
| `sources` | Array of all guides/FAQs used to create hints |
| `areas[].order` | Global progression order (1-based, across the whole game) |
| `situations[].order` | Global progression order for situations |
| `situations[].context` | One-line player state description (no spoilers) |
| `situations[].tags` | 5-8 descriptive tags for searchability |
| `situations[].hints` | 1-3 hints: vague nudge → specific clue → full answer |
| `situations[].sourceRefs` | Links back to the original guide section and line range |

### Hint writing rules

- **Hint 1 (Nudge):** Points the player in the right direction. Never names the solution.
- **Hint 2 (Clue):** Names the mechanic or item involved. Describes what to do conceptually.
- **Hint 3 (Answer):** Full solution. Wrap spoilers in `[SPOILER: text]` tags.
- Use `**bold**` for key items and locations.
- Use `- bullets` for multi-step solutions.

See [HINT_RULES.md](HINT_RULES.md) for the complete authoring reference.

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Svelte 5](https://svelte.dev/) | UI framework (runes, reactivity) |
| [Vite 8](https://vite.dev/) | Build + dev server |
| [Fuse.js](https://www.fusejs.io/) | Client-side fuzzy search |
| [marked](https://marked.js.org/) | Markdown rendering for hints |
| [Vitest](https://vitest.dev/) | Unit tests |
| [Playwright](https://playwright.dev/) | E2E + accessibility tests |

## Project Structure

```
hint-app/
├── src/
│   ├── App.svelte              # Root component, routing, theme toggle
│   ├── main.js                 # Vite entry point
│   ├── styles.css              # CSS tokens + base styles
│   ├── views/
│   │   ├── Home.svelte         # Game list + global search
│   │   ├── Game.svelte         # Area list + game-scoped search
│   │   ├── Area.svelte         # Situation list
│   │   └── Situation.svelte    # Progressive hint reveal
│   ├── lib/
│   │   ├── data-loader.js      # Game data registry (build-time import)
│   │   ├── search.js           # Fuse.js search setup
│   │   ├── progress.js         # localStorage for hint progress
│   │   └── markdown.js         # Markdown + spoiler tag rendering
│   └── data/
│       └── games/
│           └── 1990s/
│               └── super-metroid.json  # Demo game (included)
├── tools/
│   └── mcp-server.js           # MCP server for AI assistants
├── tests/
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright E2E + a11y tests
├── .claude/
│   └── agents/                 # Claude Code agent definitions
│       ├── game-importer.md
│       ├── hint-auditor.md
│       └── guide-rater.md
├── HINT_RULES.md               # Canonical hint authoring rules
├── DESIGN.md                   # Architecture & design decisions
└── TECH.md                     # Technical specification
```

## Disclaimer

The Super Metroid demo hint data is included for demonstration purposes only. Super Metroid is a trademark of Nintendo. This project is not affiliated with, endorsed by, or sponsored by Nintendo. The hint content describes publicly known game mechanics and does not reproduce any copyrighted game assets. Demo hint data was generated with attribution to the original FAQ source ([Foxhound3857's Strategy Guide](https://gamefaqs.gamespot.com/snes/588741-super-metroid/faqs/39375)).

## License

MIT
