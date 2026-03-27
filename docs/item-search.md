# Item Search — Unowned Gear Simulation

## The Use Case

The user wants to simulate whether an item they do NOT yet own would be an upgrade.
Example: "Is the staff from this Mythic+ dungeon boss worth farming for my mage?"

The user searches by item name, picks the item, picks the expected ilvl it would
drop at, and it gets added to the relevant slot card for inclusion in the simulation.

---

## Key Architectural Insight: SimC Knows All Items

SimC's binary bundles its own complete item database (DBC data, updated each patch).
**We do not need to store item stats locally.** We only need:

- Item ID → name + slot (for the search UI)
- Item ID + bonus_ids → simulated gear line (for the .simc file)

SimC resolves all stats, procs, and effects from the item ID + bonus_ids internally.

---

## The Two-Part Problem

### Part 1: Name → Item ID (search)

We need to find the item ID from a name the user types.

### Part 2: Item ID + Expected ilvl → SimC Line

Once we have the item ID, we need the correct `bonus_id` values that tell SimC
what ilvl and upgrade track this item is at.

---

## Part 1: Item Search Strategy

### Primary: Wowhead Suggestions API (online)

Wowhead exposes an autocomplete endpoint used by their own search bar:

```
GET https://www.wowhead.com/search?q=QUERY&xml
```

This returns XML with item matches including IDs, names, and slot info.
Make this call from Rust (avoids CORS) and parse the XML response.

Example response structure:

```xml
<wowhead>
  <item id="235620">
    <n><![CDATA[Void-Touched Longstaff]]></n>
    <inventorySlot id="17">Two-Hand</inventorySlot>
    <class id="2">Weapon</class>
  </item>
  <item id="235621">...</item>
</wowhead>
```

**Rate limiting:** Debounce search input by 400ms. Do not fire on every keystroke.

### Fallback: Bundled local item index (offline)

Ship a lightweight SQLite database (`items.db`) containing only:

- `item_id INTEGER`
- `name TEXT` (indexed for FTS — Full Text Search)
- `slot TEXT` (e.g. "main_hand", "trinket")
- `base_ilvl INTEGER`

This enables offline search and instant results. It is updated each app release.
The database does NOT contain stats — only lookup metadata.

**How to generate `items.db`:**
Use the SimC source repository's item data extractor or scrape Wowhead's item
database filtered to current-expansion items. A script in `scripts/build-item-db.ts`
should generate this file and is run by CI before each release.

The database is stored at: `src-tauri/assets/items.db`
It is bundled in the app via Tauri's `resources` array in `tauri.conf.json`.

### Search priority

1. Query local SQLite (instant, offline, for already-cached items)
2. Fire Wowhead API in parallel (for items not in the local index)
3. Merge results, deduplicate by item_id

---

## Part 2: Constructing the SimC Line for an Unowned Item

### The bonus_id problem

`bonus_ids` in SimC encode many things: ilvl upgrade tier, quality, season flags, etc.
For a simulated unowned item, the user selects the **expected drop ilvl**, and the
app maps that to the correct `bonus_ids` for the current season.

### Midnight Season 1 — Gear Tracks

**Current expansion:** World of Warcraft: Midnight, Season 1 (started March 17, 2026).

Key changes vs The War Within (previous expansion):

- No Explorer track — gear starts at Adventurer
- No Valorstones — upgrades cost only **Dawncrests** (named per track) + a small gold fee
- Stat squish occurred at Midnight pre-patch — ilvls reset to a new scale (max 289)
- 5 tracks: Adventurer, Veteran, Champion, Hero, Myth — each with 6 upgrade ranks

**Ilvl ranges (from Warcraft Wiki, Midnight Season 1):**

| Track      | Ilvl Range | Upgrade currency     | Primary sources                                          |
| ---------- | ---------- | -------------------- | -------------------------------------------------------- |
| Adventurer | 224 – 237  | Adventurer Dawncrest | World events, Normal Prey, Delves T1–4                   |
| Veteran    | 237 – 250  | Veteran Dawncrest    | LFR, Heroic dungeons, Hard Prey, Delves T5–6             |
| Champion   | 250 – 263  | Champion Dawncrest   | Normal Raid, M0, M+1–5, World Boss                       |
| Hero       | 263 – 276  | Hero Dawncrest       | Heroic Raid, M+6–9, Bountiful Delves T8+, Nightmare Prey |
| Myth       | 276 – 289  | Myth Dawncrest       | Mythic Raid, M+10+, Great Vault (top rewards)            |

This mapping must be updated each major patch. Store it in:
`src/lib/presets/gear-track-presets.ts`

```typescript
export interface GearTrack {
  name: string;
  bonusId: number; // track marker bonus_id — see "Finding bonus_ids" below
  ilvlRange: [number, number]; // [min, max] for this track
  source: string; // human-readable source for user display
}

// Midnight Season 1 — update each season
// ⚠️  bonus_ids below are PLACEHOLDERS — see "Finding bonus_ids" section
export const GEAR_TRACKS: GearTrack[] = [
  {
    name: 'Myth',
    bonusId: 0,
    ilvlRange: [276, 289],
    source: 'Mythic Raid / M+10 vault',
  },
  {
    name: 'Hero',
    bonusId: 0,
    ilvlRange: [263, 276],
    source: 'Heroic Raid / M+6–9',
  },
  {
    name: 'Champion',
    bonusId: 0,
    ilvlRange: [250, 263],
    source: 'Normal Raid / M0–M+5',
  },
  {
    name: 'Veteran',
    bonusId: 0,
    ilvlRange: [237, 250],
    source: 'Heroic Dungeon / Hard Prey',
  },
  {
    name: 'Adventurer',
    bonusId: 0,
    ilvlRange: [224, 237],
    source: 'World events / Normal Prey',
  },
];
```

### Finding the correct bonus_ids for Midnight Season 1

The `bonus_id` values that encode gear tracks are **not published in gaming guides** —
they live in the SimC source code and Blizzard's game data. Here is how to find them:

**Method 1 — SimC item_data.inc (most reliable):**
Look in the SimC GitHub repo for the current expansion branch:

```
https://github.com/simulationcraft/simc/blob/midnight/engine/dbc/generated/item_data.inc
```

Search for a known current-season item by name. Its bonus_id list will include
the track marker. Cross-reference multiple items of the same track to identify
the common bonus_id.

**Method 2 — Wowhead item XML:**
Fetch the XML for a known item and inspect the `bonus_id` list:

```
https://www.wowhead.com/item=KNOWN_ITEM_ID&xml
```

Compare items from different tracks to identify which bonus_id differs.

**Method 3 — SimC Discord / GitHub issues:**
The SimC maintainers post updated bonus_id mappings at the start of each season.
Check: https://github.com/simulationcraft/simc/issues

**Action required before first release:** populate the `bonusId` fields in
`GEAR_TRACKS` by using one of the methods above. Until they are confirmed,
the UI should show a warning: "Gear track bonus IDs not yet confirmed for this
season — results may be inaccurate."

### SimC line for an unowned item

```typescript
function buildUnownedItemLine(
  slot: string,
  itemId: number,
  trackBonusId: number, // from GEAR_TRACKS
  extraBonusIds: number[], // any other bonus_ids if known (optional)
  socketBonusId?: number, // 6935 = one extra socket bonus
): string {
  const bonusIds = [trackBonusId, ...extraBonusIds];
  let line = `${slot}=,id=${itemId},bonus_id=${bonusIds.join('/')}`;
  return line;
}
```

### The "Socket" question

The user may want to simulate the item with or without a socket. Add a checkbox:
"Assume socket" which appends the socket bonus_id to the bonus_ids.
The socket bonus_id for Midnight Season 1 must be confirmed from the SimC source
(same lookup method as gear track bonus_ids above). In The War Within it was `6935` —
do not assume this carries over between expansions.

---

## UI — Unowned Item Search Flow

### Entry point

Each gear slot card has an **"+ Add item to compare"** link below the bag items list.
Clicking it opens an inline search panel within that slot card (not a modal).

```
┌──────────────────────────────────────────────────────┐
│ 🗡 MAIN HAND                               [1 item]  │
│ ──────────────────────────────────────────────────── │
│ ✅ Void-Touched Longstaff     ilvl 639  [equipped]   │
│ ──────────────────────────────────────────────────── │
│ 🔍 Search for item to compare...                     │
│ ┌────────────────────────────────────────────────┐   │
│ │ Staff of the...                           [×] │   │
│ ├────────────────────────────────────────────────┤   │
│ │ ⚔ Staff of the Sunken Depths   (Two-Hand)     │   │
│ │ ⚔ Staff of Eternal Winter       (Two-Hand)    │   │
│ │ ⚔ Staff of the Blazing Path     (Two-Hand)    │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### After selecting an item

A small config row appears below the selected item:

```
│ ☐  Staff of the Sunken Depths  [unowned]             │
│     Track: [Hero ▼]  ilvl 649–665   ☐ Add socket    │
```

- **Track dropdown**: populated from `GEAR_TRACKS` (in `season-config.ts`)
- Selecting a track shows the ilvl range for context
- "Add socket" checkbox appends the socket bonus_id

### Visual distinction

Unowned items are marked with a `[🔍 unowned]` badge in a different color
(e.g. yellow/amber) so the user always knows which items are hypothetical.

---

## Rust Command

```rust
#[tauri::command]
pub async fn search_items(query: String) -> Result<Vec<ItemSearchResult>, String>
```

This command:

1. Queries the local SQLite `items.db` via `rusqlite` for instant results
2. Fires the Wowhead search API in parallel via `reqwest`
3. Merges and deduplicates results by `item_id`
4. Returns up to 10 results, sorted by relevance (exact name match first)

```typescript
interface ItemSearchResult {
  itemId: number;
  name: string;
  slot: string; // normalized slot name (e.g. "main_hand")
  baseIlvl: number;
  quality: number; // 0-5 for color coding
  source: 'local' | 'wowhead';
}
```

Add `rusqlite` to `src-tauri/Cargo.toml`:

```toml
rusqlite = { version = "0.31", features = ["bundled"] }
```

The `bundled` feature compiles SQLite into the binary — no system SQLite dependency.

---

## Cargo.toml additions for this feature

```toml
rusqlite = { version = "0.31", features = ["bundled"] }
```

The database file is accessed via:

```rust
let db_path = app.path().resource_dir()
    .unwrap()
    .join("assets/items.db");
let conn = rusqlite::Connection::open(&db_path)?;
```

---

## items.db Schema

```sql
CREATE TABLE items (
  item_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  slot      TEXT NOT NULL,   -- e.g. 'main_hand', 'trinket', 'head'
  base_ilvl INTEGER NOT NULL
);

-- Full-text search index for fast name lookup
CREATE VIRTUAL TABLE items_fts USING fts5(
  name,
  content='items',
  content_rowid='item_id'
);

CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name) VALUES (new.item_id, new.name);
END;
```

FTS5 query:

```sql
SELECT i.item_id, i.name, i.slot, i.base_ilvl
FROM items_fts
JOIN items i ON items_fts.rowid = i.item_id
WHERE items_fts MATCH ?
LIMIT 10;
```

---

## Generating items.db — Script

`scripts/build-item-db.ts` — run this before each release to refresh the DB.

Strategy: scrape Wowhead's item database for the current expansion, filtered to
equippable items only. Alternatively, parse the SimC source repository's
`engine/dbc/generated/item_data.inc` file which contains all items known to SimC.

The SimC item data file is at:
`https://raw.githubusercontent.com/simulationcraft/simc/midnight/engine/dbc/generated/item_data.inc`

This file is machine-parseable and is the most reliable source since it matches
exactly what the SimC binary knows about.
