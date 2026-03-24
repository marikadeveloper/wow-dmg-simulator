# build-item-db.ts — Item Database Generator

## Purpose

Generates `src-tauri/assets/items.db` — the SQLite database used for
offline item name search. Run this before every release and whenever
`CURRENT_SEASON.simcBranch` changes in `season-config.ts`.

```bash
pnpm build:item-db
```

---

## What It Does

1. Reads `CURRENT_SEASON.simcBranch` from `season-config.ts`
2. Downloads `item_data.inc` from the SimC GitHub repo for that branch
3. Parses every equippable item record from the file
4. Writes the results into `src-tauri/assets/items.db` using SQLite FTS5

---

## Source File

SimC's item data is at:

```
https://raw.githubusercontent.com/simulationcraft/simc/BRANCH/engine/dbc/generated/item_data.inc
```

Where `BRANCH` comes from `CURRENT_SEASON.simcBranch` (e.g. `midnight`).

---

## item_data.inc Format

The file contains C++ array initializer syntax. Each item record looks like:

```cpp
{ "Void-Touched Longstaff", 235620, ..., 0x11 /* inv_type=17 = two_hand */, ... },
{ "Voidcaller's Visage",    235602, ..., 0x01 /* inv_type=1  = head      */, ... },
```

Fields (positional, not named — order matters):

- Field 0: item name (quoted string)
- Field 1: item ID (integer)
- Field N: inventory type bitmask — determines slot

The exact field positions must be confirmed from the SimC source for the current
branch. Look for the struct definition in:

```
engine/dbc/item_data.hpp
```

### Inventory type → slot mapping

```typescript
const INV_TYPE_TO_SLOT: Record<number, string> = {
  1: 'head',
  2: 'neck',
  3: 'shoulder',
  4: 'back', // (shirt, but skip non-equippable)
  5: 'chest',
  6: 'waist',
  7: 'legs',
  8: 'feet',
  9: 'wrist',
  10: 'hands',
  11: 'finger', // normalize to finger1/finger2 in UI
  12: 'trinket', // normalize to trinket1/trinket2 in UI
  13: 'main_hand', // one-hand (can be MH or OH)
  14: 'off_hand',
  15: 'ranged', // skip for now
  16: 'back',
  17: 'main_hand', // two-hand
  20: 'chest', // robe
  21: 'main_hand', // main hand explicit
  22: 'off_hand', // off hand explicit
  23: 'off_hand', // held in off-hand (shields, etc.)
};
// Skip inv_type 0 (non-equippable), 4 (shirt), 19 (tabard)
```

---

## Output Schema

```sql
CREATE TABLE items (
  item_id   INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  slot      TEXT NOT NULL,
  base_ilvl INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE items_fts USING fts5(
  name,
  content='items',
  content_rowid='item_id'
);

CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, name) VALUES (new.item_id, new.name);
END;
```

---

## Script Implementation Sketch

```typescript
// scripts/build-item-db.ts
import { CURRENT_SEASON } from '../src/lib/presets/season-config';
import Database from 'better-sqlite3'; // pnpm add -D better-sqlite3 @types/better-sqlite3
import * as path from 'path';
import * as fs from 'fs';

const BRANCH = CURRENT_SEASON.simcBranch;
const URL = `https://raw.githubusercontent.com/simulationcraft/simc/${BRANCH}/engine/dbc/generated/item_data.inc`;
const OUT = path.resolve('src-tauri/assets/items.db');

async function main() {
  console.log(`Fetching item_data.inc from branch: ${BRANCH}`);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching item data`);
  const text = await res.text();

  console.log('Parsing items...');
  const items = parseItemData(text);
  console.log(`Parsed ${items.length} equippable items`);

  console.log(`Writing to ${OUT}`);
  if (fs.existsSync(OUT)) fs.unlinkSync(OUT);
  const db = new Database(OUT);

  db.exec(`
    CREATE TABLE items (
      item_id   INTEGER PRIMARY KEY,
      name      TEXT NOT NULL,
      slot      TEXT NOT NULL,
      base_ilvl INTEGER NOT NULL DEFAULT 0
    );
    CREATE VIRTUAL TABLE items_fts USING fts5(
      name, content='items', content_rowid='item_id'
    );
    CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, name) VALUES (new.item_id, new.name);
    END;
  `);

  const insert = db.prepare(
    'INSERT INTO items (item_id, name, slot, base_ilvl) VALUES (?, ?, ?, ?)',
  );

  const insertMany = db.transaction((rows: typeof items) => {
    for (const item of rows) {
      insert.run(item.id, item.name, item.slot, item.baseIlvl);
    }
  });

  insertMany(items);
  db.close();
  console.log(`Done. Database written to ${OUT}`);
}

function parseItemData(text: string) {
  // ⚠️  The exact regex/parser must be validated against the actual
  //     item_data.inc format for the current SimC branch.
  //     This is a structural sketch — adjust field indices as needed.
  const items: { id: number; name: string; slot: string; baseIlvl: number }[] =
    [];
  // ... parsing logic here ...
  return items;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## Dependencies

Add to `package.json` devDependencies:

```json
"better-sqlite3": "^9.0.0",
"@types/better-sqlite3": "^7.0.0"
```

---

## Tauri bundling — resources config

The generated `items.db` must be declared as a resource in `tauri.conf.json`
so it is bundled into the app and accessible at runtime:

```json
{
  "bundle": {
    "resources": ["assets/items.db"],
    "externalBin": ["binaries/simc"]
  }
}
```

Access it in Rust:

```rust
let db_path = app.path().resource_dir()
    .unwrap()
    .join("assets/items.db");
```

---

## Expected Output

```
Fetching item_data.inc from branch: midnight
Parsing items...
Parsed 63,241 equippable items
Writing to src-tauri/assets/items.db
Done. Database written to src-tauri/assets/items.db
```

File size: approximately 8–12 MB uncompressed.
Tauri compresses resources in the app bundle automatically.

---

## Important: Validate After Running

After running `pnpm build:item-db`, do a quick sanity check:

```bash
sqlite3 src-tauri/assets/items.db "SELECT count(*) FROM items;"
# Should return 50,000+

sqlite3 src-tauri/assets/items.db \
  "SELECT item_id, name, slot FROM items_fts WHERE items_fts MATCH 'staff' LIMIT 5;"
# Should return real staff items
```
