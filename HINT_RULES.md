# Hint Authoring & Import Rules

This document defines the canonical rules for structuring game hint data.
Both hand-written entries and the AI import tool (`tools/import-faq.js`) must
follow these rules. The import tool includes this document verbatim in its
system prompt.

---

## 1. Sequential Ordering

**Everything must follow game-progression order.**

- **Areas** are ordered in the array by when a player first encounters them.
  - For linear games: chapter/level order.
  - For open-world games with a "canonical" order: follow the most common
    walkthrough path.
  - For truly non-linear games: group by region, then order within each
    region by complexity or suggested progression.

- **Situations** within an area are ordered by when the player encounters
  them during normal play through that area.
  - Entrance/access puzzles come first.
  - Mid-area puzzles come next, in encounter order.
  - Boss fights / area completion come last.

- **The `order` field** is a 1-based integer on both areas and situations.
  It represents the global progression position within the game (not just
  within the parent). For example, if Forest Temple is the 4th major area
  and its first situation is the 15th overall situation in the game, that
  situation's `order` is 15. This enables displaying a single sequential
  timeline of the entire game.

---

## 2. Context & Descriptive Tags

Tags must tell the player **where they are in the game** without spoiling
anything. A player should be able to scan tags and quickly identify which
situation matches their current position.

### Required tag categories (include at least one from each applicable category):

**Progression phase** — where in the overall game:
- `early-game`, `mid-game`, `late-game`, `endgame`, `post-game`
- Or chapter/act numbers: `chapter-3`, `act-2`, `disc-2`

**Character state** (if the game has character progression):
- Zelda: `child-link`, `adult-link`
- RPGs: `level-10-20`, `after-class-change`
- Metroidvanias: `pre-double-jump`, `post-grapple`

**Area context** — be specific about sub-locations:
- `forest-temple-basement`, `water-temple-3f`, `mansion-east-wing`
- Not just `forest-temple` — that's the area name, not a useful tag.

**Key items / abilities** — what the player should have or is looking for:
- `requires-hookshot`, `requires-iron-boots`, `looking-for-boss-key`
- `after-obtaining-longshot`, `before-mirror-shield`

**Encounter type** — what kind of challenge this is:
- `puzzle`, `boss`, `mini-boss`, `navigation`, `item-hunt`, `side-quest`
- `locked-door`, `hidden-path`, `npc-interaction`

### Tag format:
- Lowercase kebab-case: `adult-link`, `mid-game`, `requires-hookshot`
- 5–8 tags per situation (more is better for search)
- No generic one-word tags like `key`, `door`, `fight` — always add context

---

## 3. The `context` Field

Every situation has a `context` string — a one-line description of the
player's current state when they'd be looking for this hint.

**Format:** `"[Character state], [location detail], [what they're trying to do]"`

**Examples:**
- `"Adult Link, inside Forest Temple, trying to reach the boss room"`
- `"Child Link, Kakariko Village, looking for a way into the graveyard at night"`
- `"Myst Island, beginning of game, just arrived and exploring"`
- `"Channelwood Age, ground level, can't figure out how to reach the treehouses"`
- `"Jill, Mansion 1F east wing, all doors seem locked"`

This field is **searchable** and shown in the UI as a subtitle under the
situation title. It helps players confirm they're looking at the right hint
without reading any spoilers.

---

## 4. Completion Tracking (`totalEstimatedSituations`)

Each game JSON includes a `totalEstimatedSituations` integer — the total
number of hint-worthy situations in the full game. This enables a
"% mapped" indicator in the UI.

**How to estimate:**
- Count every puzzle, boss fight, key-item acquisition, tricky navigation,
  and common-stuck-point in the game.
- Do NOT count trivial encounters, walking between rooms, or cutscenes.
- A typical Zelda dungeon has 4–8 situations.
- A typical RPG chapter has 3–10 situations.
- When importing from a FAQ, count the number of distinct
  headings/subsections as a baseline estimate.

**The `coverage` derived value** = `(actual situations / totalEstimatedSituations) * 100`

---

## 5. Hint Writing Rules

### Progressive revelation (1–3 hints per situation):

**Hint 1 — The Nudge:**
- Points the player in the right direction.
- Never names the specific item, location, or solution.
- Uses vague language: "look carefully", "something nearby", "revisit an earlier area".

**Hint 2 — The Clue:**
- Names the specific mechanic, item type, or location involved.
- Describes what to do conceptually, but not the exact steps.
- May name a specific item in **bold**: "You need the **Hookshot**."

**Hint 3 — The Answer:**
- Full solution, step by step.
- Wrap the most spoilery detail in `[SPOILER: ...]` tags.
- Still try to be concise — 2–3 sentences max.

### Formatting:
- Use **bold** for key items, character names, and important locations.
- Use bullet lists (`- item`) for multi-step solutions.
- Use `[SPOILER: text]` for major reveals (boss weakness, final answer, plot points).
- Keep each hint to 1–3 sentences.

---

## 6. Schema Reference

```json
{
  "slug": "game-slug",
  "title": "Full Game Title",
  "year": 1998,
  "era": "1990s",
  "totalEstimatedSituations": 45,
  "importedAt": "2026-04-05T00:00:00Z",
  "importSource": { "file": "faq.txt", "url": "https://..." },
  "sources": [
    {
      "id": "src-1",
      "name": "Author's Game Walkthrough",
      "url": "https://gamefaqs.gamespot.com/...",
      "author": "AuthorName",
      "platform": "GameFAQs"
    }
  ],
  "areas": [
    {
      "id": "area-slug",
      "name": "Area Name",
      "order": 4,
      "situations": [
        {
          "id": "situation-slug",
          "title": "Short Descriptive Title",
          "order": 15,
          "context": "Adult Link, inside Forest Temple, trying to reach the boss room",
          "tags": [
            "adult-link", "mid-game", "forest-temple-main-room",
            "requires-bow", "puzzle", "poe-sisters"
          ],
          "hints": ["Hint 1", "Hint 2", "Hint 3"],
          "sourceRefs": [
            { "sourceId": "src-1", "section": "Section heading from FAQ", "lines": "234-280" }
          ]
        }
      ]
    }
  ]
}
```

### Source Attribution

Every game tracks its sources (FAQs, walkthroughs, guides used to create the hints):

**Game-level `sources` array:**
- `id` — unique identifier within this game (e.g., `"src-1"`)
- `name` — descriptive name of the source (e.g., "Devin Morgan's OoT Walkthrough")
- `url` — link to the original guide (GameFAQs, etc.)
- `author` — author name
- `platform` — where it's from ("GameFAQs", "IGN", "hand-written", etc.)

**Situation-level `sourceRefs` array:**
- `sourceId` — references a source `id` from the game-level array
- `section` — the section/heading in the original FAQ this came from
- `lines` — line range in the original file (e.g., "234-280")

This enables full traceability from any hint back to the original guide section.

---

## 7. Game-Specific Conventions

When importing a game, the importer should apply game-specific tag conventions.
These are guidelines, not exhaustive — use judgment for edge cases.

### The Legend of Zelda series
- Always tag `child-link` or `adult-link` (OoT/MM).
- Tag dungeon floors: `water-temple-b1`, `water-temple-3f`.
- Tag required items: `requires-hookshot`, `requires-iron-boots`.
- Tag dungeon items: `looking-for-compass`, `looking-for-boss-key`.
- Sequence: child dungeons → adult dungeons → Ganon's Castle.

### Myst / puzzle-adventure games
- Tag by age/world: `myst-island`, `mechanical-age`, `channelwood-age`.
- Tag progression: `early-game` (Myst Island), `mid-game` (Ages), `late-game` (endgame choice).
- Tag puzzle type: `logic-puzzle`, `observation-puzzle`, `combination-lock`, `machinery`.
- Tag what the player has/hasn't done: `before-entering-ages`, `after-first-age`.

### Resident Evil / survival horror
- Tag by character: `jill`, `chris`, `leon`, `claire`.
- Tag by location specificity: `mansion-1f-east`, `guardhouse-basement`.
- Tag resource state: `low-ammo-strategy`, `requires-specific-key`.
- Tag puzzle type: `combination-lock`, `item-placement`, `boss-strategy`.

### RPGs (Final Fantasy, Chrono Trigger, etc.)
- Tag by chapter/disc: `disc-1`, `chapter-3`, `world-of-ruin`.
- Tag by party: `with-aeris`, `solo-section`, `requires-specific-character`.
- Tag by level range: `level-10-20`, `level-30-plus`.
- Tag optional vs required: `main-quest`, `side-quest`, `optional-boss`.

### Platformers (Mario, Metroid, Castlevania)
- Tag by world/level: `world-3`, `level-3-2`, `norfair`.
- Tag abilities: `pre-wall-jump`, `after-morph-ball`, `requires-speed-booster`.
- Tag secret type: `hidden-block`, `warp-zone`, `secret-exit`.
