import { CURRENT_SEASON } from '../src/lib/presets/season-config';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const BRANCH = CURRENT_SEASON.simcBranch;
const URL = `https://raw.githubusercontent.com/simulationcraft/simc/${BRANCH}/engine/dbc/generated/item_data.inc`;
const OUT = path.resolve('src-tauri/assets/items.db');

// Inventory type → slot mapping (from docs/build-item-db.md)
const INV_TYPE_TO_SLOT: Record<number, string> = {
  1: 'head',
  2: 'neck',
  3: 'shoulder',
  5: 'chest',
  6: 'waist',
  7: 'legs',
  8: 'feet',
  9: 'wrist',
  10: 'hands',
  11: 'finger',
  12: 'trinket',
  13: 'main_hand',
  14: 'off_hand',
  16: 'back',
  17: 'main_hand', // two-hand
  20: 'chest',     // robe
  21: 'main_hand', // main hand explicit
  22: 'off_hand',  // off hand explicit
  23: 'off_hand',  // held in off-hand (shields, etc.)
};

// Inventory types to skip: 0 (non-equippable), 4 (shirt), 15 (ranged), 19 (tabard)
const SKIP_INV_TYPES = new Set([0, 4, 15, 19]);

interface ParsedItem {
  id: number;
  name: string;
  slot: string;
  baseIlvl: number;
  quality: number;
  invType: number;
}

/**
 * Parse item_data.inc from SimC source.
 *
 * Each item record is a C++ struct initializer line like:
 *   { "Item Name", 12345, ... },
 *
 * The file format is positional. We extract:
 *   - Field 0: name (quoted string)
 *   - Field 1: item ID (integer)
 *   - Remaining fields parsed by position for inv_type and ilvl
 */
function parseItemData(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  // Match lines that look like item data entries: { "Name", id, ... }
  // Each line is a C++ struct initializer
  const lineRegex = /\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*([\s\S]*?)\}/g;

  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(text)) !== null) {
    const name = match[1];
    const id = parseInt(match[2], 10);
    const rest = match[3];

    if (!name || isNaN(id) || id === 0) continue;

    // Parse the remaining comma-separated fields
    // Remove comments like /* ... */ and split
    const cleaned = rest.replace(/\/\*.*?\*\//g, '').trim();
    const fields = cleaned.split(/\s*,\s*/).map((f) => f.trim()).filter(Boolean);

    // The field layout varies by SimC version. We need to find:
    // - inventory type (typically an early field, often a hex value like 0x11)
    // - item level (typically a later field)
    //
    // For robustness, we look for the inv_type in the fields.
    // In modern SimC, field layout after id is approximately:
    //   flags1, flags2, type_flags, level (ilvl), req_level, req_skill,
    //   req_skill_level, quality, inv_type, ...
    //
    // inv_type is at field index 8, ilvl at field index 3

    if (fields.length < 9) continue;

    const parseField = (f: string): number => {
      const s = f.trim();
      if (s.startsWith('0x') || s.startsWith('0X')) return parseInt(s, 16);
      return parseInt(s, 10);
    };

    const ilvl = parseField(fields[3]);
    const quality = parseField(fields[7]);
    const invType = parseField(fields[8]);

    if (isNaN(invType) || SKIP_INV_TYPES.has(invType)) continue;

    const slot = INV_TYPE_TO_SLOT[invType];
    if (!slot) continue;

    items.push({
      id,
      name,
      slot,
      baseIlvl: isNaN(ilvl) ? 0 : ilvl,
      quality: isNaN(quality) ? 4 : quality,
      invType,
    });
  }

  return items;
}

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
      base_ilvl INTEGER NOT NULL DEFAULT 0,
      quality   INTEGER NOT NULL DEFAULT 4,
      inv_type  INTEGER NOT NULL DEFAULT 0
    );
    CREATE VIRTUAL TABLE items_fts USING fts5(
      name, content='items', content_rowid='item_id'
    );
    CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, name) VALUES (new.item_id, new.name);
    END;
  `);

  const insert = db.prepare(
    'INSERT OR IGNORE INTO items (item_id, name, slot, base_ilvl, quality, inv_type) VALUES (?, ?, ?, ?, ?, ?)',
  );

  const insertMany = db.transaction((rows: ParsedItem[]) => {
    for (const item of rows) {
      insert.run(item.id, item.name, item.slot, item.baseIlvl, item.quality, item.invType);
    }
  });

  insertMany(items);
  db.close();
  console.log(`Done. Database written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
