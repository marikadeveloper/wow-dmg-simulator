import {
  CURRENT_SEASON,
  GEAR_TRACKS,
  SOCKET_BONUS_ID,
  GEM_PRESETS,
  ENCHANT_PRESETS,
  TIER_SLOT_ORDER,
} from '../src/lib/presets/season-config';

import {
  RAID_INSTANCES,
  MYTHIC_PLUS_DUNGEONS,
  WORLD_BOSSES,
  CATALYST_MAPPINGS,
  RAID_ILVL_MAP,
  KEYSTONE_ILVL_TABLE,
} from '../src/lib/presets/loot-tables';

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`\u2717 ${msg}`);
  errors++;
}

function warn(msg: string) {
  console.warn(`\u26A0 ${msg}`);
  warnings++;
}

function pass(msg: string) {
  console.log(`\u2713 ${msg}`);
}

// ── Season metadata ──────────────────────────────────────────────────────────

if (!CURRENT_SEASON.expansion) fail('CURRENT_SEASON.expansion is empty');
else pass(`Season: ${CURRENT_SEASON.label}`);

if (!CURRENT_SEASON.simcBranch) fail('CURRENT_SEASON.simcBranch is empty');
else pass(`SimC branch: ${CURRENT_SEASON.simcBranch}`);

if (CURRENT_SEASON.maxIlvl <= 0) fail('CURRENT_SEASON.maxIlvl is invalid');
else pass(`Max ilvl: ${CURRENT_SEASON.maxIlvl}`);

// ── Gear tracks ──────────────────────────────────────────────────────────────

for (const track of GEAR_TRACKS) {
  if (track.bonusId === 0) {
    fail(`${track.name} track: bonusId is 0 (placeholder — must be filled before release)`);
  } else {
    pass(`${track.name}: bonusId=${track.bonusId}`);
  }

  const [min, max] = track.ilvlRange;
  if (min >= max) fail(`${track.name} track: ilvlRange [${min}, ${max}] is invalid`);
}

// Check for duplicate bonus_ids (ignoring 0 placeholders)
const nonZeroBonusIds = GEAR_TRACKS.map((t) => t.bonusId).filter((b) => b !== 0);
const uniqueBonusIds = new Set(nonZeroBonusIds);
if (uniqueBonusIds.size !== nonZeroBonusIds.length) {
  fail('Duplicate bonusId found across gear tracks');
}

// ── Socket bonus_id ──────────────────────────────────────────────────────────

if (SOCKET_BONUS_ID === 0) {
  warn('SOCKET_BONUS_ID is 0 — socket feature will be disabled until set');
} else {
  pass(`SOCKET_BONUS_ID: ${SOCKET_BONUS_ID}`);
}

// ── Gem presets ──────────────────────────────────────────────────────────────

if (GEM_PRESETS.length === 0) {
  fail('GEM_PRESETS is empty');
} else {
  for (const gem of GEM_PRESETS) {
    if (gem.id === 0) {
      fail(`Gem "${gem.name}" has id=0 (placeholder — must be filled)`);
    }
    if (!gem.name || gem.name.startsWith('TODO')) {
      fail(`Gem "${gem.name}" has placeholder name`);
    }
  }
  const gemIds = GEM_PRESETS.map((g) => g.id);
  const uniqueGemIds = new Set(gemIds);
  if (uniqueGemIds.size !== gemIds.length) {
    fail('Duplicate gem id found in GEM_PRESETS');
  }
  pass(`${GEM_PRESETS.length} gem presets validated`);
}

// ── Enchant presets ──────────────────────────────────────────────────────────

if (ENCHANT_PRESETS.length === 0) {
  fail('ENCHANT_PRESETS is empty');
} else {
  for (const enchant of ENCHANT_PRESETS) {
    if (enchant.id === 0) {
      fail(`Enchant "${enchant.name}" has id=0 (placeholder — must be filled)`);
    }
    if (!enchant.name || enchant.name.startsWith('TODO')) {
      fail(`Enchant "${enchant.name}" has placeholder name`);
    }
  }
  const enchantIds = ENCHANT_PRESETS.map((e) => e.id);
  const uniqueEnchantIds = new Set(enchantIds);
  if (uniqueEnchantIds.size !== enchantIds.length) {
    fail(`Duplicate enchant id found in ENCHANT_PRESETS`);
  }
  pass(`${ENCHANT_PRESETS.length} enchant presets validated`);
}

// ── Loot tables ─────────────────────────────────────────────────────────────

// Raid instances
if (RAID_INSTANCES.length === 0) {
  warn('RAID_INSTANCES is empty — Droptimizer raid source will have no data');
} else {
  const allRaidItems = new Set<number>();
  for (const raid of RAID_INSTANCES) {
    if (raid.encounters.length === 0) {
      fail(`Raid "${raid.name}" has no encounters`);
    }
    for (const enc of raid.encounters) {
      if (enc.items.length === 0) {
        fail(`Encounter "${enc.name}" in "${raid.name}" has no items`);
      }
      if (enc.bossTier < 1 || enc.bossTier > 4) {
        fail(`Encounter "${enc.name}" has invalid bossTier=${enc.bossTier} (must be 1-4)`);
      }
      for (const item of enc.items) {
        if (allRaidItems.has(item.itemId)) {
          warn(`Duplicate item ID ${item.itemId} ("${item.name}") in raid loot tables`);
        }
        allRaidItems.add(item.itemId);
      }
    }
  }
  pass(`${RAID_INSTANCES.length} raids, ${allRaidItems.size} unique raid items`);
}

// Armor type validation for all loot items
const ARMOR_SLOTS = new Set(['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']);
const allLootItems = [
  ...RAID_INSTANCES.flatMap((r) => r.encounters.flatMap((e) => e.items)),
  ...MYTHIC_PLUS_DUNGEONS.flatMap((d) => d.items),
  ...WORLD_BOSSES.flatMap((w) => w.items),
];
let missingArmorType = 0;
for (const item of allLootItems) {
  if (ARMOR_SLOTS.has(item.slot) && !item.armorType) {
    fail(`Item ${item.itemId} ("${item.name}") in slot "${item.slot}" is missing armorType`);
    missingArmorType++;
  }
}
if (missingArmorType === 0) {
  pass('All armor-slot items have armorType set');
}

// M+ dungeons
if (MYTHIC_PLUS_DUNGEONS.length === 0) {
  warn('MYTHIC_PLUS_DUNGEONS is empty — Droptimizer M+ source will have no data');
} else {
  let totalDungeonItems = 0;
  for (const dg of MYTHIC_PLUS_DUNGEONS) {
    if (dg.items.length === 0) {
      fail(`Dungeon "${dg.name}" has no items`);
    }
    totalDungeonItems += dg.items.length;
  }
  pass(`${MYTHIC_PLUS_DUNGEONS.length} dungeons, ${totalDungeonItems} total dungeon items`);
}

// World bosses
if (WORLD_BOSSES.length === 0) {
  warn('WORLD_BOSSES is empty — Droptimizer world boss source will have no data');
} else {
  for (const wb of WORLD_BOSSES) {
    if (wb.items.length === 0) {
      fail(`World boss "${wb.name}" has no items`);
    }
  }
  pass(`${WORLD_BOSSES.length} world bosses validated`);
}

// Raid ilvl map
for (const diff of ['lfr', 'normal', 'heroic', 'mythic'] as const) {
  const tiers = RAID_ILVL_MAP[diff];
  if (!tiers || Object.keys(tiers).length === 0) {
    fail(`RAID_ILVL_MAP missing entry for "${diff}"`);
  }
}
pass('RAID_ILVL_MAP has all 4 difficulties');

// Keystone ilvl table
if (KEYSTONE_ILVL_TABLE.length === 0) {
  fail('KEYSTONE_ILVL_TABLE is empty');
} else {
  pass(`${KEYSTONE_ILVL_TABLE.length} keystone ilvl entries`);
}

// Catalyst mappings
if (CATALYST_MAPPINGS.length === 0) {
  warn('CATALYST_MAPPINGS is empty — catalyst feature disabled');
} else {
  for (const cm of CATALYST_MAPPINGS) {
    if (!TIER_SLOT_ORDER.includes(cm.slot as typeof TIER_SLOT_ORDER[number])) {
      fail(`Catalyst mapping has invalid slot "${cm.slot}"`);
    }
    if (cm.sourceItemIds.length === 0) {
      warn(`Catalyst mapping for slot "${cm.slot}" has no source items`);
    }
  }
  const totalCatalystItems = CATALYST_MAPPINGS.reduce((sum, cm) => sum + cm.sourceItemIds.length, 0);
  pass(`${CATALYST_MAPPINGS.length} catalyst slots, ${totalCatalystItems} source items`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('');
console.log(`Results: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error('VALIDATION FAILED — fix all errors before releasing.');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('Validation passed with warnings.');
} else {
  console.log('All checks passed!');
}
