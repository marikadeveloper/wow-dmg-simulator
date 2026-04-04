// ─────────────────────────────────────────────────────────────────────────────
// loot-tables.ts — Droptimizer loot table data for the current season.
//
// Contains: raid instances, M+ dungeons, world bosses, ilvl mappings,
// catalyst mappings, and class/armor-type filtering helpers.
//
// Generated initially by: pnpm build:loot-db (scripts/build-loot-db.ts)
// Then curated manually. This committed file IS the source of truth.
// After editing, run: pnpm season:validate
// ─────────────────────────────────────────────────────────────────────────────

import { TIER_SETS, CLASS_TO_TIER_SET_ID, TIER_SLOT_ORDER, TRACK_BONUS_RANGES } from './season-config';

// ── Types ────────────────────────────────────────────────────────────────────

export type RaidDifficulty = 'lfr' | 'normal' | 'heroic' | 'mythic';

/** A single item in a loot table. */
export interface LootItem {
  /** WoW item ID (matches items.db item_id) */
  itemId: number;
  /** Human-readable item name */
  name: string;
  /** Equip slot: 'head', 'neck', 'shoulder', 'back', 'chest', 'wrist',
   *  'hands', 'waist', 'legs', 'feet', 'finger', 'trinket', 'main_hand', 'off_hand' */
  slot: string;
  /** Armor type — undefined for non-armor (trinkets, necks, rings, cloaks, weapons) */
  armorType?: 'cloth' | 'leather' | 'mail' | 'plate';
  /** If set, only these WoW class keywords can use this item.
   *  undefined = available to all classes that match armorType (or all classes for non-armor). */
  classRestrictions?: string[];
  /** Extra ranks added to the boss tier for "very rare" drops (e.g. +2 for end-boss specials).
   *  undefined = 0. A value of 2 means the item drops at bossTier + 2 rank. */
  bonusRankOffset?: number;
}

/** A raid boss encounter with its loot. */
export interface RaidEncounter {
  /** Unique key, e.g. 'beloren_child_of_alar' */
  id: string;
  /** Display name, e.g. "Belo'ren, Child of Al'ar" */
  name: string;
  /** Boss tier position (1 = early, 2 = early-mid, 3 = mid-late, 4 = end boss).
   *  Determines ilvl offset within each raid difficulty. */
  bossTier: 1 | 2 | 3 | 4;
  /** Items this boss drops (all classes — filter at runtime). */
  items: LootItem[];
}

/** A raid instance containing multiple encounters. */
export interface RaidInstance {
  /** Unique key, e.g. 'march_on_queldanas' */
  id: string;
  /** Display name, e.g. "March on Quel'Danas" */
  name: string;
  /** Encounters in boss order. */
  encounters: RaidEncounter[];
}

/** A Mythic+ dungeon with its loot pool. */
export interface MplusDungeon {
  /** Unique key, e.g. 'algethars_academy' */
  id: string;
  /** Display name, e.g. "Algeth'ar Academy" */
  name: string;
  /** All items that can drop from this dungeon (no per-boss breakdown). */
  items: LootItem[];
}

/** A world boss with its loot. */
export interface WorldBoss {
  /** Unique key, e.g. 'cragpine' */
  id: string;
  /** Display name */
  name: string;
  /** Items this boss drops. */
  items: LootItem[];
}

/** Keystone level → item level mapping entry. */
export interface KeystoneIlvlEntry {
  /** Display label, e.g. 'Heroic', 'M0', '+2', '+7-9 Vault' */
  label: string;
  /** Numeric keystone level (0 = heroic, 1 = M0, 2+ = key level).
   *  Vault entries use the key level threshold. */
  keystoneLevel: number;
  /** Item level for end-of-dungeon drops at this key level. */
  ilvl: number;
  /** true for Great Vault reward entries (higher ilvl than end-of-dungeon). */
  isVault?: boolean;
}

/** Catalyst slot mapping — which non-tier items can become tier pieces. */
export interface CatalystMapping {
  /** Tier slot: 'head', 'shoulder', 'chest', 'hands', 'legs' */
  slot: string;
  /** Non-tier item IDs from loot tables that can be catalyzed into the tier piece. */
  sourceItemIds: number[];
}

// ── Class → Armor Type ──────────────────────────────────────────────────────

export const CLASS_ARMOR_TYPE: Record<string, 'cloth' | 'leather' | 'mail' | 'plate'> = {
  mage: 'cloth',
  priest: 'cloth',
  warlock: 'cloth',
  demonhunter: 'leather',
  druid: 'leather',
  monk: 'leather',
  rogue: 'leather',
  evoker: 'mail',
  hunter: 'mail',
  shaman: 'mail',
  deathknight: 'plate',
  paladin: 'plate',
  warrior: 'plate',
};

// ── Raid ilvl Mapping ───────────────────────────────────────────────────────
// Raid difficulty × boss tier → item level.
// Boss tier: 1 = early bosses, 2 = early-mid, 3 = mid-late, 4 = end boss.

export const RAID_ILVL_MAP: Record<RaidDifficulty, Record<number, number>> = {
  lfr:    { 1: 233, 2: 237, 3: 240, 4: 243, 5: 246, 6: 250 },
  normal: { 1: 246, 2: 250, 3: 253, 4: 256, 5: 259, 6: 263 },
  heroic: { 1: 259, 2: 263, 3: 266, 4: 269, 5: 272, 6: 276 },
  mythic: { 1: 272, 2: 276, 3: 279, 4: 282, 5: 285, 6: 289 },
};

/** Raid difficulty display labels with associated gear track names. */
export const RAID_DIFFICULTY_LABELS: Record<RaidDifficulty, { label: string; track: string }> = {
  lfr:    { label: 'Raid Finder', track: 'Veteran' },
  normal: { label: 'Normal', track: 'Champion' },
  heroic: { label: 'Heroic', track: 'Hero' },
  mythic: { label: 'Mythic', track: 'Myth' },
};

/**
 * Raid drop base bonus IDs. These are added to every raid loot item's bonus_id
 * list alongside the gear track rank bonus_id. SimC needs these to properly
 * resolve raid drop items. Values confirmed from Raidbots Droptimizer output.
 */
export const RAID_DROP_BONUS_IDS = [4799, 4786];

/**
 * M+ / dungeon drop base bonus ID. Raidbots uses [4786, rankBonusId] for M+ items
 * (without the 4799 that raid items have).
 */
export const MPLUS_DROP_BASE_BONUS_ID = 4786;

/**
 * Map raid difficulty to the gear track name.
 * Boss tier maps to rank within the track (tier 1 → rank 1, tier 2 → rank 2, etc.)
 */
export const RAID_DIFFICULTY_TRACK: Record<RaidDifficulty, string> = {
  lfr:    'Veteran',
  normal: 'Champion',
  heroic: 'Hero',
  mythic: 'Myth',
};

/** Slots that should receive a socket bonus_id (13668) in Droptimizer. */
export const SOCKETABLE_DROPTIMIZER_SLOTS = new Set(['neck', 'finger']);

/**
 * Compute M+ bonus_ids for a dungeon drop at a given keystone level.
 * Returns [4786, rankBonusId] matching Raidbots format.
 *
 * Maps keystone ilvl → matching raid difficulty rank → track bonus_id.
 */
export function getMplusDropBonusIds(keystoneLevel: number): number[] {
  const ilvl = getKeystoneIlvl(keystoneLevel);
  if (ilvl === 0) return [];

  // Find which raid difficulty row + rank matches this ilvl
  for (const [difficulty, rankMap] of Object.entries(RAID_ILVL_MAP) as [RaidDifficulty, Record<number, number>][]) {
    for (const [rankStr, rankIlvl] of Object.entries(rankMap)) {
      if (rankIlvl === ilvl) {
        const rank = Number(rankStr);
        const trackName = RAID_DIFFICULTY_TRACK[difficulty];
        const track = TRACK_BONUS_RANGES.find((t) => t.name === trackName);
        if (track) {
          const rankBonusId = track.startBonusId + (rank - 1);
          return [MPLUS_DROP_BASE_BONUS_ID, rankBonusId];
        }
      }
    }
  }

  return []; // fallback: use ilevel=
}

// ── Keystone Level → ilvl Table ─────────────────────────────────────────────

export const KEYSTONE_ILVL_TABLE: KeystoneIlvlEntry[] = [
  { label: 'Heroic',       keystoneLevel: 0,  ilvl: 224 },
  { label: 'Mythic',       keystoneLevel: 1,  ilvl: 246 },
  { label: 'Mythic 2',     keystoneLevel: 2,  ilvl: 250 },
  { label: 'Mythic 3',     keystoneLevel: 3,  ilvl: 250 },
  { label: 'Mythic 4',     keystoneLevel: 4,  ilvl: 253 },
  { label: 'Mythic 5',     keystoneLevel: 5,  ilvl: 256 },
  { label: 'Mythic 6',     keystoneLevel: 6,  ilvl: 259 },
  { label: 'Mythic 7',     keystoneLevel: 7,  ilvl: 259 },
  { label: 'Mythic 8',     keystoneLevel: 8,  ilvl: 263 },
  { label: 'Mythic 9',     keystoneLevel: 9,  ilvl: 263 },
  { label: 'Mythic 10',    keystoneLevel: 10, ilvl: 266 },
  // Great Vault rewards (higher ilvl than end-of-dungeon drops)
  { label: '+7-9 Vault',   keystoneLevel: 7,  ilvl: 269, isVault: true },
  { label: '+10 Vault',    keystoneLevel: 10, ilvl: 272, isVault: true },
  { label: '+12 Vault',    keystoneLevel: 12, ilvl: 276, isVault: true },
  { label: '+15 Vault',    keystoneLevel: 15, ilvl: 279, isVault: true },
  { label: '+18 Vault',    keystoneLevel: 18, ilvl: 282, isVault: true },
];

// ── World Boss ilvl ─────────────────────────────────────────────────────────

/** World bosses drop a fixed ilvl (Champion 2/6). */
export const WORLD_BOSS_ILVL = 250;

// ── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get the item level for a raid drop given difficulty and boss tier.
 */
export function getRaidIlvl(difficulty: RaidDifficulty, bossTier: number): number {
  return RAID_ILVL_MAP[difficulty]?.[bossTier] ?? 0;
}

/**
 * Get the item level for a keystone level (end-of-dungeon drops).
 * For vault rewards, pass isVault = true.
 */
export function getKeystoneIlvl(keystoneLevel: number, isVault = false): number {
  const entry = KEYSTONE_ILVL_TABLE.find(
    (e) => e.keystoneLevel === keystoneLevel && (e.isVault ?? false) === isVault,
  );
  return entry?.ilvl ?? 0;
}

/**
 * Filter loot items to only those usable by a given class.
 * Checks armor type compatibility and class restrictions.
 */
const ARMOR_SLOTS = new Set(['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']);

export function getItemsForClass(items: LootItem[], className: string): LootItem[] {
  const classArmor = CLASS_ARMOR_TYPE[className];
  return items.filter((item) => {
    // Check class restrictions first (e.g. class-specific trinkets/weapons)
    if (item.classRestrictions && !item.classRestrictions.includes(className)) {
      return false;
    }
    // Armor items must match the class's armor type.
    // If an armor-slot item is missing armorType, exclude it (data error).
    if (item.armorType) return item.armorType === classArmor;
    if (ARMOR_SLOTS.has(item.slot)) return false;
    // Non-armor items (trinkets, rings, necks, cloaks, weapons) are available to all
    return true;
  });
}

/**
 * Get catalyst-eligible items for a class in a specific tier slot.
 * Returns non-tier items from the provided list that occupy a tier slot
 * and could be catalyzed into the class's tier piece.
 */
export function getCatalystItemsForSlot(
  items: LootItem[],
  className: string,
  slot: string,
): LootItem[] {
  // Only tier slots can be catalyzed
  if (!TIER_SLOT_ORDER.includes(slot as typeof TIER_SLOT_ORDER[number])) return [];

  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return [];
  const tierSet = TIER_SETS.find((s) => s.id === setId);
  if (!tierSet) return [];

  const slotIdx = TIER_SLOT_ORDER.indexOf(slot as typeof TIER_SLOT_ORDER[number]);
  const tierItemId = tierSet.itemIds[slotIdx];

  // Return items in this slot that are NOT already the tier piece
  return items.filter((item) => item.slot === slot && item.itemId !== tierItemId);
}

/**
 * Get the tier piece item ID for a class in a given slot.
 * Used to build the catalyst variant's SimC line.
 */
export function getTierPieceId(className: string, slot: string): number | undefined {
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return undefined;
  const tierSet = TIER_SETS.find((s) => s.id === setId);
  if (!tierSet) return undefined;
  const slotIdx = TIER_SLOT_ORDER.indexOf(slot as typeof TIER_SLOT_ORDER[number]);
  if (slotIdx === -1) return undefined;
  return tierSet.itemIds[slotIdx];
}

// ── Raid Instances ──────────────────────────────────────────────────────────
// Data sourced from Wowhead zone pages and research snapshots.
// Boss tier assignments based on observed Heroic ilvl data from Raidbots.

export const RAID_INSTANCES: RaidInstance[] = [
  // ── The Voidspire (6 bosses) ──────────────────────────────────────────────
  // Boss tiers and item assignments verified against Raidbots Droptimizer output.
  {
    id: 'the_voidspire',
    name: 'The Voidspire',
    encounters: [
      {
        id: 'imperator_averzian',
        name: 'Imperator Averzian',
        bossTier: 1,
        items: [
          { itemId: 249319, name: 'Endless March Waistwrap', slot: 'waist', armorType: 'cloth' },
          { itemId: 249323, name: 'Leggings of the Devouring Advance', slot: 'legs', armorType: 'cloth' },
          { itemId: 249335, name: 'Imperator\'s Banner', slot: 'back' },
          { itemId: 249339, name: 'Gloom-Spattered Dreadscale', slot: 'trinket' },
          { itemId: 249380, name: 'Hate-Tied Waistchain', slot: 'waist', armorType: 'plate' },
          { itemId: 249303, name: 'Waistcord of the Judged', slot: 'waist', armorType: 'mail' },
          { itemId: 249314, name: 'Twisted Twilight Sash', slot: 'waist', armorType: 'leather' },
          { itemId: 249311, name: 'Lightblood Greaves', slot: 'legs', armorType: 'plate' },
          { itemId: 249312, name: 'Nightblade\'s Pantaloons', slot: 'legs', armorType: 'leather' },
          // Class set backs (all classes share back slot, no armor type)
          { itemId: 250055, name: 'Voidbreaker\'s Encryption', slot: 'back' },
        ],
      },
      {
        id: 'vorasius',
        name: 'Vorasius',
        bossTier: 2,
        items: [
          { itemId: 249276, name: 'Grimoire of the Eternal Light', slot: 'off_hand' },
          { itemId: 249315, name: 'Voracious Wristwraps', slot: 'wrist', armorType: 'cloth' },
          { itemId: 249325, name: 'Untethered Berserker\'s Grips', slot: 'hands', armorType: 'mail' },
          { itemId: 249304, name: 'Fallen King\'s Cuffs', slot: 'wrist', armorType: 'mail' },
          { itemId: 249326, name: 'Light\'s March Bracers', slot: 'wrist', armorType: 'plate' },
          { itemId: 249327, name: 'Void-Skinned Bracers', slot: 'wrist', armorType: 'leather' },
          { itemId: 249336, name: 'Signet of the Starved Beast', slot: 'finger' },
          { itemId: 249342, name: 'Heart of Ancient Hunger', slot: 'trinket' },
          { itemId: 249925, name: 'Hungering Victory', slot: 'main_hand' },
          // Class set wrists
          { itemId: 250056, name: 'Voidbreaker\'s Bracers', slot: 'wrist', armorType: 'cloth' },
        ],
      },
      {
        id: 'fallen_king_salhadaar',
        name: 'Fallen-King Salhadaar',
        bossTier: 2,
        items: [
          { itemId: 249281, name: 'Blade of the Final Twilight', slot: 'main_hand' },
          { itemId: 249293, name: 'Weight of Command', slot: 'main_hand' },
          { itemId: 249308, name: 'Despotic Raiment', slot: 'chest', armorType: 'cloth' },
          { itemId: 249309, name: 'Sunbound Breastplate', slot: 'chest', armorType: 'plate' },
          { itemId: 249310, name: 'Robes of the Voidbound', slot: 'chest', armorType: 'mail' },
          { itemId: 249322, name: 'Radiant Clutchtender\'s Jerkin', slot: 'chest', armorType: 'leather' },
          { itemId: 249337, name: 'Ribbon of Coiled Malice', slot: 'neck' },
          { itemId: 249340, name: 'Wraps of Cosmic Madness', slot: 'trinket' },
          { itemId: 249341, name: 'Volatile Void Suffuser', slot: 'trinket' },
          // Class set shoulders
          { itemId: 250058, name: 'Voidbreaker\'s Leyline Nexi', slot: 'shoulder', armorType: 'cloth' },
        ],
      },
      {
        id: 'vaelgor_and_ezzorak',
        name: 'Vaelgor & Ezzorak',
        bossTier: 3,
        items: [
          { itemId: 249280, name: 'Emblazoned Sunglaive', slot: 'main_hand' },
          { itemId: 249287, name: 'Clutchmates\' Caress', slot: 'main_hand' },
          { itemId: 249305, name: 'Slippers of the Midnight Flame', slot: 'feet', armorType: 'cloth' },
          { itemId: 249320, name: 'Sabatons of Obscurement', slot: 'feet', armorType: 'mail' },
          { itemId: 249332, name: 'Parasite Stompers', slot: 'feet', armorType: 'plate' },
          { itemId: 249334, name: 'Void-Claimed Shinkickers', slot: 'feet', armorType: 'leather' },
          { itemId: 249346, name: 'Vaelgor\'s Final Stare', slot: 'trinket' },
          { itemId: 249370, name: 'Draconic Nullcape', slot: 'back' },
          // Class set backs + feet
          { itemId: 250055, name: 'Voidbreaker\'s Encryption', slot: 'back' },
          { itemId: 250062, name: 'Voidbreaker\'s Treads', slot: 'feet', armorType: 'cloth' },
        ],
      },
      {
        id: 'lightblinded_vanguard',
        name: 'Lightblinded Vanguard',
        bossTier: 3,
        items: [
          { itemId: 249294, name: 'Blade of the Blind Verdict', slot: 'main_hand' },
          { itemId: 249295, name: 'Turalyon\'s False Echo', slot: 'main_hand' },
          { itemId: 249275, name: 'Bulwark of Noble Resolve', slot: 'off_hand' },
          { itemId: 249306, name: 'Devouring Night\'s Visage', slot: 'head', armorType: 'leather' },
          { itemId: 249316, name: 'Crown of the Fractured Tyrant', slot: 'head', armorType: 'plate' },
          { itemId: 249317, name: 'Frenzy\'s Rebuke', slot: 'head', armorType: 'mail' },
          { itemId: 249313, name: 'Light-Judged Spaulders', slot: 'shoulder', armorType: 'plate' },
          { itemId: 249318, name: 'Nullwalker\'s Dread Epaulettes', slot: 'shoulder', armorType: 'mail' },
          { itemId: 249333, name: 'Blooming Barklight Spaulders', slot: 'shoulder', armorType: 'leather' },
          { itemId: 249321, name: 'Vaelgor\'s Fearsome Grasp', slot: 'hands', armorType: 'leather' },
          { itemId: 249330, name: 'War Chaplain\'s Grips', slot: 'hands', armorType: 'cloth' },
          { itemId: 249307, name: 'Emberborn Grasps', slot: 'hands', armorType: 'plate' },
          { itemId: 249344, name: 'Light Company Guidon', slot: 'trinket' },
          { itemId: 249369, name: 'Bond of Light', slot: 'finger' },
          { itemId: 249808, name: 'Litany of Lightblind Wrath', slot: 'trinket' },
          // Class set shoulders
          { itemId: 250058, name: 'Voidbreaker\'s Leyline Nexi', slot: 'shoulder', armorType: 'cloth' },
        ],
      },
      {
        id: 'crown_of_the_cosmos',
        name: 'Crown of the Cosmos',
        bossTier: 4,
        items: [
          { itemId: 249298, name: 'Tormentor\'s Bladed Fists', slot: 'main_hand' },
          { itemId: 249302, name: 'Inescapable Reach', slot: 'main_hand' },
          { itemId: 260423, name: 'Arator\'s Swift Remembrance', slot: 'main_hand' },
          { itemId: 249329, name: 'Gaze of the Unrestrained', slot: 'head', armorType: 'cloth' },
          { itemId: 249331, name: 'Ezzorak\'s Gloombind', slot: 'waist', armorType: 'plate' },
          { itemId: 249345, name: 'Ranger-Captain\'s Iridescent Insignia', slot: 'trinket' },
          { itemId: 249368, name: 'Eternal Voidsong Chain', slot: 'neck', bonusRankOffset: 2 },
          { itemId: 249382, name: 'Canopy Walker\'s Footwraps', slot: 'feet', armorType: 'leather' },
          { itemId: 249809, name: 'Locus-Walker\'s Ribbon', slot: 'trinket' },
        ],
      },
    ],
  },

  // ── March on Quel'Danas (2 bosses) ────────────────────────────────────────
  {
    id: 'march_on_queldanas',
    name: "March on Quel'Danas",
    encounters: [
      // Source: https://warcraft.wiki.gg/wiki/Belo%27ren,_Child_of_Al%27ar#Loot
      {
        id: 'beloren_child_of_alar',
        name: "Belo'ren, Child of Al'ar",
        bossTier: 4,
        items: [
          { itemId: 249283, name: "Belo'melorn, the Shattered Talon", slot: 'main_hand' },
          { itemId: 249284, name: "Belo'ren's Swift Talon", slot: 'main_hand' },
          { itemId: 249307, name: 'Emberborn Grasps', slot: 'hands', armorType: 'plate' },
          { itemId: 249322, name: "Radiant Clutchtender's Jerkin", slot: 'chest', armorType: 'leather' },
          { itemId: 249324, name: 'Eternal Flame Scaleguards', slot: 'legs', armorType: 'mail' },
          { itemId: 249328, name: 'Echoing Void Mantle', slot: 'shoulder', armorType: 'cloth' },
          { itemId: 249376, name: 'Whisper-Inscribed Sash', slot: 'waist', armorType: 'cloth' },
          { itemId: 249377, name: 'Darkstrider Treads', slot: 'feet', armorType: 'mail' },
          { itemId: 249806, name: 'Radiant Plume', slot: 'trinket' },
          { itemId: 249807, name: 'The Eternal Egg', slot: 'trinket' },
          { itemId: 249919, name: "Sin'dorei Band of Hope", slot: 'finger' },
          { itemId: 249921, name: 'Thalassian Dawnguard', slot: 'off_hand' },
          { itemId: 260235, name: 'Umbral Plume', slot: 'trinket' },
          // Class set shoulders + waist
          { itemId: 250057, name: "Voidbreaker's Sage Cord", slot: 'waist', armorType: 'cloth' },
          { itemId: 250058, name: "Voidbreaker's Leyline Nexi", slot: 'shoulder', armorType: 'cloth' },
        ],
      },
      // Source: https://warcraft.wiki.gg/wiki/Midnight_Falls
      {
        id: 'midnight_falls',
        name: 'Midnight Falls',
        bossTier: 4,
        items: [
          { itemId: 249286, name: 'Brazier of the Dissonant Dirge', slot: 'main_hand' },
          { itemId: 249296, name: "Alah'endal, the Dawnsong", slot: 'main_hand' },
          { itemId: 249367, name: 'Chiming Void Curio', slot: 'trinket' },
          { itemId: 249810, name: 'Shadow of the Empyrean Requiem', slot: 'trinket' },
          { itemId: 249811, name: 'Light of the Cosmic Crescendo', slot: 'trinket' },
          { itemId: 249912, name: 'Robes of Endless Oblivion', slot: 'chest', armorType: 'cloth' },
          { itemId: 249913, name: 'Mask of Darkest Intent', slot: 'head', armorType: 'leather' },
          { itemId: 249914, name: 'Oblivion Guise', slot: 'head', armorType: 'mail' },
          { itemId: 249915, name: 'Extinction Guards', slot: 'legs', armorType: 'plate' },
          { itemId: 249920, name: 'Eye of Midnight', slot: 'finger', bonusRankOffset: 2 },
          { itemId: 250247, name: 'Amulet of the Abyssal Hymn', slot: 'neck' },
          { itemId: 260408, name: 'Lightless Lament', slot: 'main_hand' },
          // Class set shoulders
          { itemId: 250058, name: "Voidbreaker's Leyline Nexi", slot: 'shoulder', armorType: 'cloth' },
        ],
      },
    ],
  },

  // ── The Dreamrift (1 boss) ────────────────────────────────────────────────
  {
    id: 'the_dreamrift',
    name: 'The Dreamrift',
    encounters: [
      {
        id: 'chimaerus_the_undreamt_god',
        name: 'Chimaerus the Undreamt God',
        bossTier: 2,
        items: [
          { itemId: 249278, name: 'Alnscorned Spire', slot: 'main_hand' },
          { itemId: 249922, name: 'Tome of Alnscorned Regret', slot: 'off_hand' },
          { itemId: 249371, name: 'Scornbane Waistguard', slot: 'waist', armorType: 'plate' },
          { itemId: 249373, name: 'Dream-Scorched Striders', slot: 'feet', armorType: 'cloth' },
          { itemId: 249374, name: "Scorn-Scarred Shul'ka's Belt", slot: 'waist', armorType: 'mail' },
          { itemId: 249381, name: 'Greaves of the Unformed', slot: 'feet', armorType: 'plate' },
          { itemId: 249343, name: 'Gaze of the Alnseer', slot: 'trinket' },
          { itemId: 249805, name: "Undreamt God's Oozing Vestige", slot: 'trinket' },
          // Class set feet
          { itemId: 250062, name: 'Voidbreaker\'s Treads', slot: 'feet', armorType: 'cloth' },
        ],
      },
    ],
  },
];

// ── Mythic+ Dungeons ────────────────────────────────────────────────────────
// M+ dungeon loot pools. Items are the same regardless of keystone level;
// the ilvl is determined by KEYSTONE_ILVL_TABLE at runtime.

export const MYTHIC_PLUS_DUNGEONS: MplusDungeon[] = [
  // ── Algeth'ar Academy ─────────────────────────────────────────────────────
  {
    id: 'algethars_academy',
    name: "Algeth'ar Academy",
    items: [
      { itemId: 193703, name: "Organized Pontificator's Mask", slot: 'head', armorType: 'cloth' },
      { itemId: 193704, name: 'Scaled Commencement Spaulders', slot: 'shoulder', armorType: 'mail' },
      { itemId: 193705, name: 'Breastplate of Proven Knowledge', slot: 'chest', armorType: 'plate' },
      { itemId: 193706, name: "Venerated Professor's Greaves", slot: 'legs', armorType: 'plate' },
      { itemId: 193708, name: 'Platinum Star Band', slot: 'finger' },
      { itemId: 193709, name: "Vexamus' Expulsion Rod", slot: 'off_hand' },
      { itemId: 193710, name: 'Spellboon Saber', slot: 'main_hand' },
      { itemId: 193711, name: 'Spellbane Cutlass', slot: 'main_hand' },
      { itemId: 193712, name: 'Potion-Stained Cloak', slot: 'back' },
      { itemId: 193713, name: 'Experimental Safety Gloves', slot: 'hands', armorType: 'cloth' },
      { itemId: 193714, name: 'Frenzyroot Cuffs', slot: 'wrist', armorType: 'leather' },
      { itemId: 193715, name: 'Boots of Explosive Growth', slot: 'feet', armorType: 'mail' },
      { itemId: 193716, name: "Algeth'ar Hedgecleaver", slot: 'main_hand' },
      { itemId: 193717, name: "Mystakria's Harvester", slot: 'main_hand' },
      { itemId: 193720, name: "Bronze Challenger's Robe", slot: 'chest', armorType: 'cloth' },
      { itemId: 193721, name: "Ruby Contestant's Gloves", slot: 'hands', armorType: 'leather' },
      { itemId: 193722, name: 'Azure Belt of Competition', slot: 'waist', armorType: 'mail' },
      { itemId: 193723, name: 'Obsidian Goaltending Spire', slot: 'main_hand' },
      { itemId: 258529, name: 'Arcaneclaw Spear', slot: 'main_hand' },
      { itemId: 258531, name: "Crawth's Scaleguard", slot: 'off_hand' },
    ],
  },

  // ── Magisters' Terrace ────────────────────────────────────────────────────
  {
    id: 'magisters_terrace',
    name: "Magisters' Terrace",
    items: [
      { itemId: 251100, name: 'Malfeasance Mallet', slot: 'main_hand' },
      { itemId: 251101, name: "Arcane Guardian's Shell", slot: 'chest', armorType: 'plate' },
      { itemId: 251102, name: 'Clasp of Compliance', slot: 'waist', armorType: 'plate' },
      { itemId: 251103, name: 'Custodial Cuffs', slot: 'wrist', armorType: 'mail' },
      { itemId: 251104, name: 'Leggings of Orderly Conduct', slot: 'legs', armorType: 'leather' },
      { itemId: 251105, name: 'Ward of the Spellbreaker', slot: 'off_hand' },
      { itemId: 251106, name: 'Resolute Runeglaive', slot: 'main_hand' },
      { itemId: 251107, name: 'Oathsworn Stompers', slot: 'feet', armorType: 'plate' },
      { itemId: 251108, name: 'Wraps of Watchful Wrath', slot: 'wrist', armorType: 'cloth' },
      { itemId: 251109, name: 'Spellsnap Shadowmask', slot: 'head', armorType: 'leather' },
      { itemId: 251110, name: "Sunlash's Sunsash", slot: 'waist', armorType: 'leather' },
      { itemId: 251111, name: 'Splitshroud Stinger', slot: 'main_hand' },
      { itemId: 251112, name: 'Shadowsplit Girdle', slot: 'waist', armorType: 'mail' },
      { itemId: 251113, name: 'Gloves of Viscous Goo', slot: 'hands', armorType: 'mail' },
      { itemId: 251114, name: 'Voidwarped Oozemail', slot: 'chest', armorType: 'mail' },
      { itemId: 251115, name: 'Bifurcation Band', slot: 'finger' },
      { itemId: 251117, name: 'Whirling Voidcleaver', slot: 'main_hand' },
    ],
  },

  // ── Nexus-Point Xenas ─────────────────────────────────────────────────────
  {
    id: 'nexus_point_xenas',
    name: 'Nexus-Point Xenas',
    items: [
      { itemId: 251201, name: 'Corespark Multitool', slot: 'main_hand' },
      { itemId: 251202, name: 'Reflux Reflector', slot: 'off_hand' },
      { itemId: 251203, name: "Kasreth's Bindings", slot: 'wrist', armorType: 'cloth' },
      { itemId: 251204, name: "Corewright's Zappers", slot: 'hands', armorType: 'leather' },
      { itemId: 251205, name: 'Leyline Leggings', slot: 'legs', armorType: 'cloth' },
      { itemId: 251206, name: 'Fluxweave Cloak', slot: 'back' },
      { itemId: 251207, name: 'Dreadflail Bludgeon', slot: 'main_hand' },
      { itemId: 251208, name: 'Lightscarred Cuisses', slot: 'legs', armorType: 'plate' },
      { itemId: 251209, name: 'Corewarden Cuffs', slot: 'wrist', armorType: 'mail' },
      { itemId: 251210, name: 'Eclipse Espadrilles', slot: 'feet', armorType: 'cloth' },
      { itemId: 251211, name: 'Fractured Fingerguards', slot: 'hands', armorType: 'plate' },
      { itemId: 251212, name: 'Radiant Slicer', slot: 'main_hand' },
      { itemId: 251213, name: "Nysarra's Mantle", slot: 'shoulder', armorType: 'leather' },
      { itemId: 251217, name: 'Occlusion of Void', slot: 'finger' },
      { itemId: 251218, name: "Taz'Rah's Cosmic Edge", slot: 'main_hand' },
      { itemId: 251219, name: 'Riftworn Stompers', slot: 'feet', armorType: 'plate' },
      { itemId: 251220, name: 'Voidscarred Crown', slot: 'head', armorType: 'mail' },
      { itemId: 251234, name: 'Graft of the Domanaar', slot: 'neck' },
    ],
  },

  // ── Seat of the Triumvirate ───────────────────────────────────────────────
  {
    id: 'seat_of_the_triumvirate',
    name: 'Seat of the Triumvirate',
    items: [
      { itemId: 152000, name: 'Shadowfused Chain Coif', slot: 'head', armorType: 'mail' },
      { itemId: 152001, name: "Nexus Conductor's Headgear", slot: 'head', armorType: 'leather' },
      { itemId: 152002, name: 'Battalion-Shattering Leggings', slot: 'legs', armorType: 'leather' },
      { itemId: 152003, name: 'Legguards of Numbing Gloom', slot: 'legs', armorType: 'mail' },
      { itemId: 152004, name: 'Pauldrons of the Soulburner', slot: 'shoulder', armorType: 'cloth' },
      { itemId: 152005, name: 'Pauldrons of Colossal Burden', slot: 'shoulder', armorType: 'plate' },
      { itemId: 152006, name: "Depraved Tactician's Waistguard", slot: 'waist', armorType: 'leather' },
      { itemId: 152007, name: 'Sash of the Gilded Rose', slot: 'waist', armorType: 'cloth' },
      { itemId: 152008, name: 'Reality-Splitting Wristguards', slot: 'wrist', armorType: 'plate' },
      { itemId: 152009, name: 'Doomwalker Warboots', slot: 'feet', armorType: 'leather' },
      { itemId: 152010, name: 'Burning Coven Sabatons', slot: 'feet', armorType: 'plate' },
      { itemId: 152012, name: 'Molten Bite Handguards', slot: 'hands', armorType: 'leather' },
      { itemId: 152062, name: 'Greatcloak of the Dark Pantheon', slot: 'back' },
      { itemId: 152063, name: 'Seal of the Portalmaster', slot: 'finger' },
      { itemId: 152064, name: 'Band of the Sargerite Smith', slot: 'finger' },
    ],
  },

  // ── Pit of Saron ──────────────────────────────────────────────────────────
  {
    id: 'pit_of_saron',
    name: 'Pit of Saron',
    items: [
      { itemId: 50202, name: 'Snowstorm Helm', slot: 'head', armorType: 'mail' },
      { itemId: 50203, name: 'Blood Weeper', slot: 'main_hand' },
      { itemId: 50205, name: "Frostbinder's Shredded Cape", slot: 'back' },
      { itemId: 50206, name: "Frayed Scoundrel's Cap", slot: 'head', armorType: 'leather' },
      { itemId: 50207, name: 'Black Spire Sabatons', slot: 'feet', armorType: 'plate' },
      { itemId: 50208, name: 'Pauldrons of the Souleater', slot: 'shoulder', armorType: 'cloth' },
      { itemId: 50209, name: 'Essence of Suffering', slot: 'wrist', armorType: 'cloth' },
      { itemId: 50210, name: 'Seethe', slot: 'main_hand' },
      { itemId: 50211, name: 'Arcane Loops of Anger', slot: 'neck' },
      { itemId: 50227, name: "Surgeon's Needle", slot: 'main_hand' },
      { itemId: 50228, name: 'Barbed Ymirheim Choker', slot: 'neck' },
      { itemId: 50229, name: 'Legguards of the Frosty Depths', slot: 'legs', armorType: 'mail' },
      { itemId: 50230, name: 'Malykriss Vambraces', slot: 'wrist', armorType: 'plate' },
      { itemId: 50233, name: "Spurned Val'kyr Shoulderguards", slot: 'shoulder', armorType: 'leather' },
      { itemId: 50234, name: 'Shoulderplates of Frozen Blood', slot: 'shoulder', armorType: 'plate' },
      { itemId: 50235, name: "Ick's Rotting Thumb", slot: 'trinket' },
      { itemId: 50259, name: 'Nevermelting Ice Crystal', slot: 'trinket' },
      { itemId: 50263, name: 'Braid of Salt and Fire', slot: 'waist', armorType: 'cloth' },
      { itemId: 50267, name: 'Tyrannical Beheader', slot: 'main_hand' },
      { itemId: 50268, name: "Rimefang's Claw", slot: 'main_hand' },
      { itemId: 50271, name: 'Band of Stained Souls', slot: 'finger' },
    ],
  },

  // ── Maisara Caverns ───────────────────────────────────────────────────────
  {
    id: 'maisara_caverns',
    name: 'Maisara Caverns',
    items: [
      { itemId: 251175, name: 'Soulblight Cleaver', slot: 'main_hand' },
      { itemId: 251176, name: "Reanimator's Weight", slot: 'shoulder', armorType: 'plate' },
      { itemId: 251177, name: 'Fetid Vilecrown', slot: 'head', armorType: 'cloth' },
      { itemId: 251178, name: 'Ceremonial Hexblade', slot: 'main_hand' },
      { itemId: 251179, name: 'Decaying Cuirass', slot: 'chest', armorType: 'plate' },
      { itemId: 251180, name: 'Thornblade', slot: 'main_hand' },
      { itemId: 251181, name: 'Pruning Lance', slot: 'main_hand' },
      { itemId: 251182, name: 'Bedrock Breeches', slot: 'legs', armorType: 'mail' },
      { itemId: 251183, name: 'Rootwarden Wraps', slot: 'wrist', armorType: 'leather' },
      { itemId: 251184, name: 'Ironroot Collar', slot: 'shoulder', armorType: 'leather' },
      { itemId: 251185, name: 'Lightblossom Cinch', slot: 'waist', armorType: 'cloth' },
      { itemId: 251186, name: 'Thorntalon Edge', slot: 'main_hand' },
      { itemId: 251189, name: 'Rootwalker Harness', slot: 'waist', armorType: 'mail' },
      { itemId: 251190, name: 'Bloodthorn Burnous', slot: 'back' },
      { itemId: 251191, name: 'Luminescent Sprout', slot: 'off_hand' },
      { itemId: 251192, name: 'Branch of Pride', slot: 'main_hand' },
      { itemId: 251194, name: "Lightwarden's Bind", slot: 'finger' },
      { itemId: 251197, name: 'Thornspike Gauntlets', slot: 'hands', armorType: 'plate' },
      { itemId: 251199, name: 'Worldroot Canopy', slot: 'head', armorType: 'mail' },
    ],
  },

  // ── Skyreach ──────────────────────────────────────────────────────────────
  {
    id: 'skyreach',
    name: 'Skyreach',
    items: [
      { itemId: 258218, name: "Skybreaker's Blade", slot: 'main_hand' },
      { itemId: 251143, name: "Grim Harvest Gloves", slot: 'main_hand' },
      { itemId: 251144, name: "Autumn's Boon Belt", slot: 'waist', armorType: 'leather' },
      { itemId: 251145, name: 'Forgotten Tribe Footguards', slot: 'feet', armorType: 'mail' },
      { itemId: 251146, name: "Scavenger's Spaulders", slot: 'shoulder', armorType: 'mail' },
      { itemId: 251147, name: 'Hoarded Harvest Wrap', slot: 'chest', armorType: 'leather' },
      { itemId: 251148, name: 'Pilfered Precious Band', slot: 'finger' },
      { itemId: 251149, name: "Victor's Flashfrozen Blade", slot: 'main_hand' },
      { itemId: 251150, name: "Tempest's Shelter", slot: 'off_hand' },
      { itemId: 251151, name: "Sentinel Challenger's Prize", slot: 'chest', armorType: 'plate' },
      { itemId: 251152, name: "Season's Turn Gauntlets", slot: 'hands', armorType: 'mail' },
      { itemId: 251153, name: "Arctic Explorer's Legwraps", slot: 'feet', armorType: 'cloth' },
      { itemId: 251154, name: "Winter's Embrace Bracers", slot: 'wrist', armorType: 'plate' },
      { itemId: 251155, name: "Tribal Defender's Cord", slot: 'waist', armorType: 'plate' },
      { itemId: 251156, name: "Fallen Speaker's Staff", slot: 'main_hand' },
    ],
  },

  // ── Windrunner Spire ──────────────────────────────────────────────────────
  {
    id: 'windrunner_spire',
    name: 'Windrunner Spire',
    items: [
      { itemId: 251118, name: 'Legplates of Lingering Dusk', slot: 'legs', armorType: 'plate' },
      { itemId: 251119, name: 'Vortex Visage', slot: 'head', armorType: 'plate' },
      { itemId: 251120, name: 'Wraps of Umbral Descent', slot: 'chest', armorType: 'cloth' },
      { itemId: 251121, name: "Domanaar's Dire Treads", slot: 'feet', armorType: 'leather' },
      { itemId: 251122, name: 'Shadowslash Slicer', slot: 'main_hand' },
      { itemId: 251123, name: "Nibbles' Training Rod", slot: 'main_hand' },
      { itemId: 251124, name: 'Gauntlets of Fevered Defense', slot: 'hands', armorType: 'plate' },
      { itemId: 251125, name: 'Felsoaked Soles', slot: 'feet', armorType: 'cloth' },
      { itemId: 251126, name: 'Greathelm of Temptation', slot: 'head', armorType: 'leather' },
      { itemId: 251127, name: 'Nibbling Armbands', slot: 'wrist', armorType: 'leather' },
      { itemId: 251128, name: 'Bladesorrow', slot: 'main_hand' },
      { itemId: 251129, name: 'Counterfeit Clutches', slot: 'hands', armorType: 'cloth' },
      { itemId: 251130, name: 'Breeches of Deft Deals', slot: 'legs', armorType: 'leather' },
      { itemId: 251131, name: 'Jangling Felpaulets', slot: 'shoulder', armorType: 'cloth' },
      { itemId: 251132, name: 'Speakeasy Shroud', slot: 'back' },
      { itemId: 251136, name: 'Signet of Snarling Servitude', slot: 'finger' },
      { itemId: 251142, name: 'Pendant of Malefic Fury', slot: 'neck' },
    ],
  },
];

// ── World Bosses ────────────────────────────────────────────────────────────
// All world bosses drop at WORLD_BOSS_ILVL (250, Champion 2/6).

export const WORLD_BOSSES: WorldBoss[] = [
  {
    id: 'thormbelan',
    name: "Thorm'belan",
    items: [
      { itemId: 250452, name: 'Blooming Thornblade', slot: 'main_hand' },
      { itemId: 250455, name: 'Beastly Blossombarb', slot: 'main_hand' },
    ],
  },
  {
    id: 'predaxas',
    name: 'Predaxas',
    items: [
      { itemId: 250448, name: "Voidbender's Spire", slot: 'main_hand' },
      { itemId: 250460, name: 'Encroaching Shadow Signet', slot: 'finger' },
      { itemId: 250449, name: 'Skulking Nettledirk', slot: 'main_hand' },
    ],
  },
  {
    id: 'luashal',
    name: "Lu'ashal",
    items: [
      { itemId: 250447, name: 'Radiant Eversong Scepter', slot: 'off_hand' },
      { itemId: 250453, name: 'Scepter of the Unbound Light', slot: 'main_hand' },
      { itemId: 250454, name: "Devouring Vanguard's Soulcleaver", slot: 'main_hand' },
    ],
  },
  {
    id: 'cragpine',
    name: 'Cragpine',
    items: [
      { itemId: 250446, name: 'Cragtender Bulwark', slot: 'off_hand' },
      { itemId: 250451, name: 'Dawncrazed Beast Cleaver', slot: 'main_hand' },
      { itemId: 250456, name: "Wretched Scholar's Gilded Robe", slot: 'chest', armorType: 'cloth' },
      { itemId: 250457, name: "Devouring Outrider's Chausses", slot: 'legs', armorType: 'plate' },
      { itemId: 250458, name: "Host Commander's Casque", slot: 'head', armorType: 'plate' },
      { itemId: 250459, name: "Bramblestalker's Feathered Cowl", slot: 'head', armorType: 'leather' },
      { itemId: 250461, name: 'Chain of the Ancient Watcher', slot: 'neck' },
      { itemId: 250462, name: "Forgotten Farstrider's Insignia", slot: 'trinket' },
    ],
  },
];

// ── Catalyst Mappings ───────────────────────────────────────────────────────
// Catalyst converts non-tier items in tier slots into the character's tier piece.
// sourceItemIds are populated from all raid + dungeon items in tier slots.
// Tier slots: head, shoulder, chest, hands, legs (from TIER_SLOT_ORDER).

export const CATALYST_MAPPINGS: CatalystMapping[] = [
  {
    slot: 'head',
    sourceItemIds: [
      50202, 50206, 152000, 152001, 193703, 249306, 249316, 249317,
      249329, 249913, 249914, 250458, 250459, 251109, 251119, 251126, 251177, 251199, 251220,
    ],
  },
  {
    slot: 'shoulder',
    sourceItemIds: [
      50208, 50233, 50234, 152004, 152005, 193704, 249313, 249318,
      249328, 249333, 251131, 251146, 251176, 251184, 251213,
    ],
  },
  {
    slot: 'chest',
    sourceItemIds: [
      193705, 193720, 249308, 249309, 249310, 249322, 250456,
      251101, 251114, 251120, 251147, 251151, 251179,
    ],
  },
  {
    slot: 'hands',
    sourceItemIds: [
      152012, 193713, 193721, 249307, 249321, 249325, 249330,
      251113, 251124, 251129, 251152, 251197, 251204, 251211,
    ],
  },
  {
    slot: 'legs',
    sourceItemIds: [
      50229, 152002, 152003, 193706, 249311, 249312, 249323, 249324, 249915,
      250457, 251104, 251118, 251130, 251182, 251205, 251208,
    ],
  },
];
