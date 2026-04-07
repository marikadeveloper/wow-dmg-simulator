/**
 * build-loot-db.ts — Generates loot table data for Drop Finder.
 *
 * Usage:
 *   pnpm build:loot-db                     # Validate existing loot-tables.ts item IDs against items.db
 *   pnpm build:loot-db -- --enrich         # Fetch item metadata from Wowhead tooltip API
 *   pnpm build:loot-db -- --seed seed.json # Generate loot-tables.ts from a seed JSON file
 *
 * This is a developer tool, NOT a CI build step.
 * The committed loot-tables.ts file IS the source of truth.
 *
 * Seed JSON format:
 * {
 *   "raids": [{
 *     "id": "the_voidspire",
 *     "name": "The Voidspire",
 *     "encounters": [{
 *       "id": "imperator_averzian",
 *       "name": "Imperator Averzian",
 *       "bossTier": 1,
 *       "itemIds": [249279, 249308, ...]
 *     }]
 *   }],
 *   "dungeons": [{ "id": "...", "name": "...", "itemIds": [...] }],
 *   "worldBosses": [{ "id": "...", "name": "...", "itemIds": [...] }]
 * }
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const ITEMS_DB_PATH = path.resolve('src-tauri/assets/items.db');
const LOOT_TABLES_PATH = path.resolve('src/lib/presets/loot-tables.ts');
const TOOLTIP_API = 'https://nether.wowhead.com/tooltip/item';

// ── Wowhead tooltip slot name → our slot name ────────────────────────────────

const WOWHEAD_SLOT_MAP: Record<string, string> = {
  head: 'head',
  neck: 'neck',
  shoulder: 'shoulder',
  back: 'back',
  chest: 'chest',
  wrist: 'wrist',
  hands: 'hands',
  waist: 'waist',
  legs: 'legs',
  feet: 'feet',
  finger: 'finger',
  trinket: 'trinket',
  'one-hand': 'main_hand',
  'main hand': 'main_hand',
  'off hand': 'off_hand',
  'two-hand': 'main_hand',
  'held in off-hand': 'off_hand',
  ranged: 'main_hand',
};

// ── inv_type → armor slot (from build-item-db.ts) ────────────────────────────

const INV_TYPE_TO_SLOT: Record<number, string> = {
  1: 'head', 2: 'neck', 3: 'shoulder', 5: 'chest', 6: 'waist',
  7: 'legs', 8: 'feet', 9: 'wrist', 10: 'hands', 11: 'finger',
  12: 'trinket', 13: 'main_hand', 14: 'off_hand', 16: 'back',
  17: 'main_hand', 20: 'chest', 21: 'main_hand', 22: 'off_hand',
  23: 'off_hand',
};

// ── Armor slots that have an armor type ──────────────────────────────────────

const ARMOR_SLOTS = new Set(['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']);

// ── Items.db lookup ──────────────────────────────────────────────────────────

interface DbItem {
  item_id: number;
  name: string;
  slot: string;
  inv_type: number;
  quality: number;
}

function lookupItemsDb(itemIds: number[]): Map<number, DbItem> {
  const result = new Map<number, DbItem>();
  if (!fs.existsSync(ITEMS_DB_PATH)) {
    console.warn(`⚠ items.db not found at ${ITEMS_DB_PATH} — skipping DB validation`);
    return result;
  }

  const db = new Database(ITEMS_DB_PATH, { readonly: true });
  const stmt = db.prepare('SELECT item_id, name, slot, inv_type, quality FROM items WHERE item_id = ?');

  for (const id of itemIds) {
    const row = stmt.get(id) as DbItem | undefined;
    if (row) result.set(id, row);
  }

  db.close();
  return result;
}

// ── Wowhead tooltip API ──────────────────────────────────────────────────────

interface TooltipData {
  name: string;
  slot: string;
  quality: number;
}

async function fetchTooltip(itemId: number): Promise<TooltipData | null> {
  try {
    const res = await fetch(`${TOOLTIP_API}/${itemId}?dataEnv=1&locale=0`);
    if (!res.ok) return null;

    const html = await res.text();

    // Extract item name from the tooltip HTML
    const nameMatch = html.match(/<b[^>]*class="q\d"[^>]*>([^<]+)<\/b>/i)
      || html.match(/"name"\s*:\s*"([^"]+)"/);
    const name = nameMatch?.[1] ?? `Item #${itemId}`;

    // Extract slot from tooltip (e.g., "Head", "Trinket", "One-Hand")
    const slotMatch = html.match(/<!--nstart-->([\w\s-]+)<!--nend-->/i)
      || html.match(/<span[^>]*>(?:Head|Neck|Shoulder|Back|Chest|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|One-Hand|Two-Hand|Main Hand|Off Hand|Held In Off-hand|Ranged)<\/span>/i);
    const rawSlot = slotMatch?.[1]?.trim().toLowerCase() ?? '';
    const slot = WOWHEAD_SLOT_MAP[rawSlot] ?? rawSlot;

    // Extract quality
    const qualityMatch = html.match(/class="q(\d)"/);
    const quality = qualityMatch ? parseInt(qualityMatch[1], 10) : 4;

    return { name, slot, quality };
  } catch {
    return null;
  }
}

// ── Validate mode — check existing loot-tables.ts item IDs ───────────────────

function extractItemIdsFromLootTables(): number[] {
  if (!fs.existsSync(LOOT_TABLES_PATH)) {
    console.error('✗ loot-tables.ts not found');
    return [];
  }

  const content = fs.readFileSync(LOOT_TABLES_PATH, 'utf-8');
  const ids: number[] = [];
  const regex = /itemId:\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    ids.push(parseInt(match[1], 10));
  }
  return ids;
}

async function validateMode(): Promise<void> {
  console.log('Validating loot-tables.ts item IDs against items.db...\n');

  const itemIds = extractItemIdsFromLootTables();
  if (itemIds.length === 0) {
    console.log('No item IDs found in loot-tables.ts (empty data arrays?)');
    return;
  }

  console.log(`Found ${itemIds.length} item IDs in loot-tables.ts`);

  const dbItems = lookupItemsDb(itemIds);
  let errors = 0;

  for (const id of itemIds) {
    if (!dbItems.has(id)) {
      console.error(`  ✗ Item ${id} not found in items.db`);
      errors++;
    }
  }

  if (errors === 0) {
    console.log(`✓ All ${itemIds.length} items validated against items.db`);
  } else {
    console.error(`\n✗ ${errors} item(s) not found in items.db`);
    process.exit(1);
  }
}

// ── Enrich mode — fetch metadata from Wowhead ───────────────────────────────

async function enrichMode(): Promise<void> {
  console.log('Enriching loot-tables.ts items with Wowhead tooltip data...\n');

  const itemIds = extractItemIdsFromLootTables();
  if (itemIds.length === 0) {
    console.log('No item IDs found in loot-tables.ts');
    return;
  }

  const unique = [...new Set(itemIds)];
  console.log(`Fetching tooltips for ${unique.length} unique items...`);

  const results: Record<number, TooltipData> = {};
  for (const id of unique) {
    const data = await fetchTooltip(id);
    if (data) {
      results[id] = data;
      process.stdout.write('.');
    } else {
      process.stdout.write('x');
    }
    // Rate limit: 100ms between requests
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n\nResults:');
  for (const [id, data] of Object.entries(results)) {
    console.log(`  ${id}: ${data.name} | ${data.slot} | Q${data.quality}`);
  }
}

// ── Seed mode — generate TypeScript from seed JSON ───────────────────────────

interface SeedEncounter {
  id: string;
  name: string;
  bossTier: number;
  itemIds: number[];
}

interface SeedRaid {
  id: string;
  name: string;
  encounters: SeedEncounter[];
}

interface SeedDungeon {
  id: string;
  name: string;
  itemIds: number[];
}

interface SeedWorldBoss {
  id: string;
  name: string;
  itemIds: number[];
}

interface SeedData {
  raids: SeedRaid[];
  dungeons: SeedDungeon[];
  worldBosses: SeedWorldBoss[];
}

function determinArmorType(invType: number, slot: string): string | null {
  // Only armor slots have armor types
  if (!ARMOR_SLOTS.has(slot)) return null;
  // We can't determine armor type from inv_type alone — the script logs these
  // for manual classification
  return null;
}

async function seedMode(seedPath: string): Promise<void> {
  console.log(`Reading seed data from: ${seedPath}`);
  const seed: SeedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  // Collect all item IDs
  const allItemIds = new Set<number>();
  for (const raid of seed.raids) {
    for (const enc of raid.encounters) {
      enc.itemIds.forEach((id) => allItemIds.add(id));
    }
  }
  for (const dg of seed.dungeons) {
    dg.itemIds.forEach((id) => allItemIds.add(id));
  }
  for (const wb of seed.worldBosses) {
    wb.itemIds.forEach((id) => allItemIds.add(id));
  }

  console.log(`Total unique items: ${allItemIds.size}`);

  // Look up in items.db
  const dbItems = lookupItemsDb([...allItemIds]);
  console.log(`Found ${dbItems.size} items in items.db`);

  // Items not in DB — fetch from Wowhead tooltip API
  const missingIds = [...allItemIds].filter((id) => !dbItems.has(id));
  if (missingIds.length > 0) {
    console.log(`\n${missingIds.length} items not in items.db — fetching from Wowhead...`);
    for (const id of missingIds) {
      const tooltip = await fetchTooltip(id);
      if (tooltip) {
        console.log(`  ${id}: ${tooltip.name} (${tooltip.slot})`);
      } else {
        console.warn(`  ⚠ ${id}: Failed to fetch tooltip`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Generate output
  console.log('\n--- Generated item entries (copy into loot-tables.ts) ---\n');

  for (const raid of seed.raids) {
    console.log(`// ── ${raid.name} ──`);
    for (const enc of raid.encounters) {
      console.log(`// ${enc.name} (tier ${enc.bossTier})`);
      for (const itemId of enc.itemIds) {
        const db = dbItems.get(itemId);
        const name = db?.name ?? `Unknown Item #${itemId}`;
        const slot = db ? INV_TYPE_TO_SLOT[db.inv_type] ?? db.slot : 'unknown';
        const isArmor = ARMOR_SLOTS.has(slot);
        console.log(
          `  { itemId: ${itemId}, name: '${name.replace(/'/g, "\\'")}', slot: '${slot}'${isArmor ? ", armorType: '???'" : ''} },`,
        );
      }
    }
    console.log();
  }

  for (const dg of seed.dungeons) {
    console.log(`// ── ${dg.name} ──`);
    for (const itemId of dg.itemIds) {
      const db = dbItems.get(itemId);
      const name = db?.name ?? `Unknown Item #${itemId}`;
      const slot = db ? INV_TYPE_TO_SLOT[db.inv_type] ?? db.slot : 'unknown';
      const isArmor = ARMOR_SLOTS.has(slot);
      console.log(
        `  { itemId: ${itemId}, name: '${name.replace(/'/g, "\\'")}', slot: '${slot}'${isArmor ? ", armorType: '???'" : ''} },`,
      );
    }
    console.log();
  }

  for (const wb of seed.worldBosses) {
    console.log(`// ── ${wb.name} ──`);
    for (const itemId of wb.itemIds) {
      const db = dbItems.get(itemId);
      const name = db?.name ?? `Unknown Item #${itemId}`;
      const slot = db ? INV_TYPE_TO_SLOT[db.inv_type] ?? db.slot : 'unknown';
      const isArmor = ARMOR_SLOTS.has(slot);
      console.log(
        `  { itemId: ${itemId}, name: '${name.replace(/'/g, "\\'")}', slot: '${slot}'${isArmor ? ", armorType: '???'" : ''} },`,
      );
    }
    console.log();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--enrich')) {
    await enrichMode();
  } else if (args.includes('--seed')) {
    const seedIdx = args.indexOf('--seed');
    const seedPath = args[seedIdx + 1];
    if (!seedPath) {
      console.error('Usage: build-loot-db.ts --seed <path-to-seed.json>');
      process.exit(1);
    }
    await seedMode(seedPath);
  } else {
    await validateMode();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
