// ─────────────────────────────────────────────────────────────────────────────
// season-config.ts — THE ONLY FILE to edit for a new season.
//
// All seasonal data lives here. Every other module imports from this file.
// After editing, run: pnpm season:validate
// Full instructions: docs/updating-seasons.md
// ─────────────────────────────────────────────────────────────────────────────

// ── Season metadata ──────────────────────────────────────────────────────────

export interface SeasonInfo {
  expansion: string;
  season: number;
  label: string;
  startDate: string; // ISO date
  maxIlvl: number;
  simcBranch: string; // GitHub branch name for SimC source
}

export const CURRENT_SEASON: SeasonInfo = {
  expansion: 'Midnight',
  season: 1,
  label: 'Midnight Season 1',
  startDate: '2026-03-17',
  maxIlvl: 289,
  simcBranch: 'midnight',
};

// ── Gear tracks ──────────────────────────────────────────────────────────────

export interface GearTrack {
  name: string;
  bonusId: number; // track marker bonus_id — 0 = TBD
  ilvlRange: [number, number]; // [min, max]
  source: string; // human-readable source for UI
}

export const GEAR_TRACKS: GearTrack[] = [
  {
    name: 'Myth',
    bonusId: 0, // TBD — find from SimC source
    ilvlRange: [276, 289],
    source: 'Mythic Raid / M+10 vault',
  },
  {
    name: 'Hero',
    bonusId: 0, // TBD
    ilvlRange: [263, 276],
    source: 'Heroic Raid / M+6–9',
  },
  {
    name: 'Champion',
    bonusId: 0, // TBD
    ilvlRange: [250, 263],
    source: 'Normal Raid / M0–M+5',
  },
  {
    name: 'Veteran',
    bonusId: 0, // TBD
    ilvlRange: [237, 250],
    source: 'Heroic Dungeon / Hard Prey',
  },
  {
    name: 'Adventurer',
    bonusId: 0, // TBD
    ilvlRange: [224, 237],
    source: 'World events / Normal Prey',
  },
];

// ── Socket bonus_id ──────────────────────────────────────────────────────────

/** The bonus_id that adds an extra socket to an item. 0 = TBD for this season. */
export const SOCKET_BONUS_ID = 0; // TBD — was 6935 in TWW S2, verify for Midnight

// ── Gem presets ──────────────────────────────────────────────────────────────

export interface GemPreset {
  id: number; // SimC gem_id
  name: string;
  stat: string; // primary stat it gives
  color: 'prismatic';
  icon: string; // Wowhead icon filename (without extension)
}

// Icon name shortcuts for gem families
const IC_DIAMOND_EPIC = 'inv_12_profession_jewelcrafting_epic_gem_cut_orange';
const IC_PERIDOT_RARE = 'inv_12_profession_jewelcrafting_rare_gem_cut_nature_green';
const IC_AMETHYST_RARE = 'inv_12_profession_jewelcrafting_rare_gem_cut_void_purple';
const IC_GARNET_RARE = 'inv_12_profession_jewelcrafting_rare_gem_cut_fire_red';
const IC_LAPIS_RARE = 'inv_12_profession_jewelcrafting_rare_gem_cut_frost_blue';
const IC_PERIDOT = 'inv_12_profession_jewelcrafting_uncommon_gem_cut_nature_green';
const IC_AMETHYST = 'inv_12_profession_jewelcrafting_uncommon_gem_cut_void_purple';
const IC_GARNET = 'inv_12_profession_jewelcrafting_uncommon_gem_cut_fire_red';
const IC_LAPIS = 'inv_12_profession_jewelcrafting_uncommon_gem_cut_frost_blue';

export const GEM_PRESETS: GemPreset[] = [
  // ── Eversong Diamond (meta/primary — Unique-Equipped) ──
  { id: 240983, name: 'Indecipherable Eversong Diamond', stat: 'Primary', color: 'prismatic', icon: IC_DIAMOND_EPIC },
  { id: 240967, name: 'Powerful Eversong Diamond', stat: 'Primary + Crit', color: 'prismatic', icon: IC_DIAMOND_EPIC },
  { id: 240971, name: 'Stoic Eversong Diamond', stat: 'Primary + Speed', color: 'prismatic', icon: IC_DIAMOND_EPIC },
  { id: 240969, name: 'Telluric Eversong Diamond', stat: 'Primary + Mana', color: 'prismatic', icon: IC_DIAMOND_EPIC },
  // ── Flawless Peridot (Haste-primary) ──
  { id: 240888, name: 'Flawless Quick Peridot', stat: 'Haste', color: 'prismatic', icon: IC_PERIDOT_RARE },
  { id: 240890, name: 'Flawless Deadly Peridot', stat: 'Haste + Crit', color: 'prismatic', icon: IC_PERIDOT_RARE },
  { id: 240892, name: 'Flawless Masterful Peridot', stat: 'Haste + Mastery', color: 'prismatic', icon: IC_PERIDOT_RARE },
  { id: 240894, name: 'Flawless Versatile Peridot', stat: 'Haste + Vers', color: 'prismatic', icon: IC_PERIDOT_RARE },
  // ── Flawless Amethyst (Mastery-primary) ──
  { id: 240896, name: 'Flawless Masterful Amethyst', stat: 'Mastery', color: 'prismatic', icon: IC_AMETHYST_RARE },
  { id: 240898, name: 'Flawless Deadly Amethyst', stat: 'Mastery + Crit', color: 'prismatic', icon: IC_AMETHYST_RARE },
  { id: 240900, name: 'Flawless Quick Amethyst', stat: 'Mastery + Haste', color: 'prismatic', icon: IC_AMETHYST_RARE },
  { id: 240902, name: 'Flawless Versatile Amethyst', stat: 'Mastery + Vers', color: 'prismatic', icon: IC_AMETHYST_RARE },
  // ── Flawless Garnet (Crit-primary) ──
  { id: 240904, name: 'Flawless Deadly Garnet', stat: 'Crit', color: 'prismatic', icon: IC_GARNET_RARE },
  { id: 240906, name: 'Flawless Quick Garnet', stat: 'Crit + Haste', color: 'prismatic', icon: IC_GARNET_RARE },
  { id: 240908, name: 'Flawless Masterful Garnet', stat: 'Crit + Mastery', color: 'prismatic', icon: IC_GARNET_RARE },
  { id: 240910, name: 'Flawless Versatile Garnet', stat: 'Crit + Vers', color: 'prismatic', icon: IC_GARNET_RARE },
  // ── Flawless Lapis (Versatility-primary) ──
  { id: 240912, name: 'Flawless Versatile Lapis', stat: 'Versatility', color: 'prismatic', icon: IC_LAPIS_RARE },
  { id: 240914, name: 'Flawless Deadly Lapis', stat: 'Vers + Crit', color: 'prismatic', icon: IC_LAPIS_RARE },
  { id: 240916, name: 'Flawless Quick Lapis', stat: 'Vers + Haste', color: 'prismatic', icon: IC_LAPIS_RARE },
  { id: 240918, name: 'Flawless Masterful Lapis', stat: 'Vers + Mastery', color: 'prismatic', icon: IC_LAPIS_RARE },
  // ── Regular quality Peridot ──
  { id: 240856, name: 'Quick Peridot', stat: 'Haste', color: 'prismatic', icon: IC_PERIDOT },
  { id: 240858, name: 'Deadly Peridot', stat: 'Haste + Crit', color: 'prismatic', icon: IC_PERIDOT },
  { id: 240860, name: 'Masterful Peridot', stat: 'Haste + Mastery', color: 'prismatic', icon: IC_PERIDOT },
  { id: 240862, name: 'Versatile Peridot', stat: 'Haste + Vers', color: 'prismatic', icon: IC_PERIDOT },
  // ── Regular quality Amethyst ──
  { id: 240864, name: 'Masterful Amethyst', stat: 'Mastery', color: 'prismatic', icon: IC_AMETHYST },
  { id: 240866, name: 'Deadly Amethyst', stat: 'Mastery + Crit', color: 'prismatic', icon: IC_AMETHYST },
  { id: 240868, name: 'Quick Amethyst', stat: 'Mastery + Haste', color: 'prismatic', icon: IC_AMETHYST },
  { id: 240870, name: 'Versatile Amethyst', stat: 'Mastery + Vers', color: 'prismatic', icon: IC_AMETHYST },
  // ── Regular quality Garnet ──
  { id: 240872, name: 'Deadly Garnet', stat: 'Crit', color: 'prismatic', icon: IC_GARNET },
  { id: 240874, name: 'Quick Garnet', stat: 'Crit + Haste', color: 'prismatic', icon: IC_GARNET },
  { id: 240876, name: 'Masterful Garnet', stat: 'Crit + Mastery', color: 'prismatic', icon: IC_GARNET },
  { id: 240878, name: 'Versatile Garnet', stat: 'Crit + Vers', color: 'prismatic', icon: IC_GARNET },
  // ── Regular quality Lapis ──
  { id: 240880, name: 'Versatile Lapis', stat: 'Versatility', color: 'prismatic', icon: IC_LAPIS },
  { id: 240882, name: 'Deadly Lapis', stat: 'Vers + Crit', color: 'prismatic', icon: IC_LAPIS },
  { id: 240884, name: 'Quick Lapis', stat: 'Vers + Haste', color: 'prismatic', icon: IC_LAPIS },
  { id: 240886, name: 'Masterful Lapis', stat: 'Vers + Mastery', color: 'prismatic', icon: IC_LAPIS },
];

// ── Enchant presets ──────────────────────────────────────────────────────────

export interface EnchantPreset {
  id: number; // SimC enchant_id
  name: string;
  slot: string; // target slot category: "finger", "back", "chest", etc.
  stat: string; // primary stat for display
}

export const ENCHANT_PRESETS: EnchantPreset[] = [
  // ── Head ──
  { id: 7988, name: 'Blessing of Speed', slot: 'head', stat: 'Speed' },
  { id: 7989, name: 'Blessing of Speed (Q2)', slot: 'head', stat: 'Speed' },
  { id: 7958, name: 'Hex of Leeching', slot: 'head', stat: 'Leech' },
  { id: 7959, name: 'Hex of Leeching (Q2)', slot: 'head', stat: 'Leech' },
  { id: 7960, name: 'Empowered Hex of Leeching', slot: 'head', stat: 'Leech' },
  { id: 7961, name: 'Empowered Hex of Leeching (Q2)', slot: 'head', stat: 'Leech' },
  { id: 7990, name: 'Empowered Blessing of Speed', slot: 'head', stat: 'Speed' },
  { id: 7991, name: 'Empowered Blessing of Speed (Q2)', slot: 'head', stat: 'Speed' },
  { id: 8014, name: 'Rune of Avoidance', slot: 'head', stat: 'Avoidance' },
  { id: 8015, name: 'Rune of Avoidance (Q2)', slot: 'head', stat: 'Avoidance' },
  { id: 8016, name: 'Empowered Rune of Avoidance', slot: 'head', stat: 'Avoidance' },
  { id: 8017, name: 'Empowered Rune of Avoidance (Q2)', slot: 'head', stat: 'Avoidance' },
  // ── Shoulder ──
  { id: 7970, name: 'Flight of the Eagle', slot: 'shoulder', stat: 'Speed' },
  { id: 7971, name: 'Flight of the Eagle (Q2)', slot: 'shoulder', stat: 'Speed' },
  { id: 7972, name: "Akil'zon's Swiftness", slot: 'shoulder', stat: 'Speed' },
  { id: 7973, name: "Akil'zon's Swiftness (Q2)", slot: 'shoulder', stat: 'Speed' },
  { id: 7998, name: "Nature's Grace", slot: 'shoulder', stat: 'Avoidance' },
  { id: 7999, name: "Nature's Grace (Q2)", slot: 'shoulder', stat: 'Avoidance' },
  { id: 8000, name: "Amirdrassil's Grace", slot: 'shoulder', stat: 'Avoidance' },
  { id: 8001, name: "Amirdrassil's Grace (Q2)", slot: 'shoulder', stat: 'Avoidance' },
  { id: 8028, name: 'Thalassian Recovery', slot: 'shoulder', stat: 'Leech' },
  { id: 8029, name: 'Thalassian Recovery (Q2)', slot: 'shoulder', stat: 'Leech' },
  { id: 8030, name: "Silvermoon's Mending", slot: 'shoulder', stat: 'Leech' },
  { id: 8031, name: "Silvermoon's Mending (Q2)", slot: 'shoulder', stat: 'Leech' },
  // ── Chest ──
  { id: 7956, name: 'Mark of Nalorakk', slot: 'chest', stat: 'Str + Stamina' },
  { id: 7957, name: 'Mark of Nalorakk (Q2)', slot: 'chest', stat: 'Str + Stamina' },
  { id: 7984, name: 'Mark of the Rootwarden', slot: 'chest', stat: 'Agi + Speed' },
  { id: 7985, name: 'Mark of the Rootwarden (Q2)', slot: 'chest', stat: 'Agi + Speed' },
  { id: 7986, name: 'Mark of the Worldsoul', slot: 'chest', stat: 'Primary' },
  { id: 7987, name: 'Mark of the Worldsoul (Q2)', slot: 'chest', stat: 'Primary' },
  { id: 8012, name: 'Mark of the Magister', slot: 'chest', stat: 'Int + Mana' },
  { id: 8013, name: 'Mark of the Magister (Q2)', slot: 'chest', stat: 'Int + Mana' },
  // ── Rings ──
  { id: 7964, name: 'Amani Mastery', slot: 'finger', stat: 'Mastery' },
  { id: 7965, name: 'Amani Mastery (Q2)', slot: 'finger', stat: 'Mastery' },
  { id: 7966, name: 'Eyes of the Eagle', slot: 'finger', stat: 'Crit Effect' },
  { id: 7967, name: 'Eyes of the Eagle (Q2)', slot: 'finger', stat: 'Crit Effect' },
  { id: 7968, name: "Zul'jin's Mastery", slot: 'finger', stat: 'Mastery' },
  { id: 7969, name: "Zul'jin's Mastery (Q2)", slot: 'finger', stat: 'Mastery' },
  { id: 7994, name: "Nature's Wrath", slot: 'finger', stat: 'Crit' },
  { id: 7995, name: "Nature's Wrath (Q2)", slot: 'finger', stat: 'Crit' },
  { id: 7996, name: "Nature's Fury", slot: 'finger', stat: 'Crit' },
  { id: 7997, name: "Nature's Fury (Q2)", slot: 'finger', stat: 'Crit' },
  { id: 8020, name: 'Thalassian Haste', slot: 'finger', stat: 'Haste' },
  { id: 8021, name: 'Thalassian Haste (Q2)', slot: 'finger', stat: 'Haste' },
  { id: 8022, name: 'Thalassian Versatility', slot: 'finger', stat: 'Versatility' },
  { id: 8023, name: 'Thalassian Versatility (Q2)', slot: 'finger', stat: 'Versatility' },
  { id: 8024, name: "Silvermoon's Alacrity", slot: 'finger', stat: 'Haste' },
  { id: 8025, name: "Silvermoon's Alacrity (Q2)", slot: 'finger', stat: 'Haste' },
  { id: 8026, name: "Silvermoon's Tenacity", slot: 'finger', stat: 'Versatility' },
  { id: 8027, name: "Silvermoon's Tenacity (Q2)", slot: 'finger', stat: 'Versatility' },
  // ── Legs (Spellthread — Tailoring) ──
  { id: 7934, name: 'Sunfire Silk Spellthread', slot: 'legs', stat: 'Int + Stamina' },
  { id: 7935, name: 'Sunfire Silk Spellthread (Q2)', slot: 'legs', stat: 'Int + Stamina' },
  { id: 7936, name: 'Arcanoweave Spellthread', slot: 'legs', stat: 'Int + Mana' },
  { id: 7937, name: 'Arcanoweave Spellthread (Q2)', slot: 'legs', stat: 'Int + Mana' },
  { id: 7938, name: 'Bright Linen Spellthread', slot: 'legs', stat: 'Intellect' },
  { id: 7939, name: 'Bright Linen Spellthread (Q2)', slot: 'legs', stat: 'Intellect' },
  // ── Legs (Armor Kit — Leatherworking) ──
  { id: 8158, name: "Forest Hunter's Armor Kit", slot: 'legs', stat: 'Agi/Str + Stamina' },
  { id: 8159, name: "Forest Hunter's Armor Kit (Q2)", slot: 'legs', stat: 'Agi/Str + Stamina' },
  { id: 8160, name: 'Thalassian Scout Armor Kit', slot: 'legs', stat: 'Agi/Str' },
  { id: 8161, name: 'Thalassian Scout Armor Kit (Q2)', slot: 'legs', stat: 'Agi/Str' },
  { id: 8162, name: "Blood Knight's Armor Kit", slot: 'legs', stat: 'Agi/Str + Armor' },
  { id: 8163, name: "Blood Knight's Armor Kit (Q2)", slot: 'legs', stat: 'Agi/Str + Armor' },
  // ── Feet ──
  { id: 7962, name: "Lynx's Dexterity", slot: 'feet', stat: 'Avoidance + Stamina' },
  { id: 7963, name: "Lynx's Dexterity (Q2)", slot: 'feet', stat: 'Avoidance + Stamina' },
  { id: 7992, name: "Shaladrassil's Roots", slot: 'feet', stat: 'Leech + Stamina' },
  { id: 7993, name: "Shaladrassil's Roots (Q2)", slot: 'feet', stat: 'Leech + Stamina' },
  { id: 8018, name: "Farstrider's Hunt", slot: 'feet', stat: 'Speed + Stamina' },
  { id: 8019, name: "Farstrider's Hunt (Q2)", slot: 'feet', stat: 'Speed + Stamina' },
  // ── Weapons ──
  { id: 7978, name: 'Strength of Halazzi', slot: 'main_hand', stat: 'Bleed proc' },
  { id: 7979, name: 'Strength of Halazzi (Q2)', slot: 'main_hand', stat: 'Bleed proc' },
  { id: 7980, name: "Jan'alai's Precision", slot: 'main_hand', stat: 'Crit proc' },
  { id: 7981, name: "Jan'alai's Precision (Q2)", slot: 'main_hand', stat: 'Crit proc' },
  { id: 7982, name: "Berserker's Rage", slot: 'main_hand', stat: 'Haste proc' },
  { id: 7983, name: "Berserker's Rage (Q2)", slot: 'main_hand', stat: 'Haste proc' },
  { id: 8006, name: 'Worldsoul Cradle', slot: 'main_hand', stat: 'Absorb shield' },
  { id: 8007, name: 'Worldsoul Cradle (Q2)', slot: 'main_hand', stat: 'Absorb shield' },
  { id: 8008, name: 'Worldsoul Aegis', slot: 'main_hand', stat: 'Absorb + explosion' },
  { id: 8009, name: 'Worldsoul Aegis (Q2)', slot: 'main_hand', stat: 'Absorb + explosion' },
  { id: 8010, name: 'Worldsoul Tenacity', slot: 'main_hand', stat: 'Vers proc' },
  { id: 8011, name: 'Worldsoul Tenacity (Q2)', slot: 'main_hand', stat: 'Vers proc' },
  { id: 8036, name: "Flames of the Sin'dorei", slot: 'main_hand', stat: 'Fire DoT' },
  { id: 8037, name: "Flames of the Sin'dorei (Q2)", slot: 'main_hand', stat: 'Fire DoT' },
  { id: 8038, name: "Acuity of the Ren'dorei", slot: 'main_hand', stat: 'Primary proc' },
  { id: 8039, name: "Acuity of the Ren'dorei (Q2)", slot: 'main_hand', stat: 'Primary proc' },
  { id: 8040, name: 'Arcane Mastery', slot: 'main_hand', stat: 'Mastery proc' },
  { id: 8041, name: 'Arcane Mastery (Q2)', slot: 'main_hand', stat: 'Mastery proc' },
];

// ── Gear track detection from bonus_ids ────────────────────────────────────
//
// Each track uses 6 consecutive bonus_ids (one per upgrade rank), with a
// 2-id gap between tracks. Pattern confirmed from Wowhead tooltip data:
//   Adventurer: 12769–12774
//   Veteran:    12777–12782
//   Champion:   12785–12790
//   Hero:       12793–12798
//   Myth:       12801–12806

/** Number of upgrade ranks per track (Midnight S1: all tracks have 6). */
const UPGRADE_RANKS = 6;

interface TrackBonusRange {
  name: string;
  startBonusId: number; // bonus_id for rank 1
}

export const TRACK_BONUS_RANGES: TrackBonusRange[] = [
  { name: 'Adventurer', startBonusId: 12769 },
  { name: 'Veteran',    startBonusId: 12777 },
  { name: 'Champion',   startBonusId: 12785 },
  { name: 'Hero',       startBonusId: 12793 },
  { name: 'Myth',       startBonusId: 12801 },
];

export interface GearTrackInfo {
  trackName: string;
  rank: number;      // 1-based
  maxRank: number;   // always 6 for Midnight S1
}

/**
 * Determine the gear track and upgrade rank from an item's bonus_ids.
 * Returns null if no track bonus_id is found.
 */
export function getGearTrackFromBonusIds(bonusIds: number[]): GearTrackInfo | null {
  for (const bonusId of bonusIds) {
    for (const track of TRACK_BONUS_RANGES) {
      const offset = bonusId - track.startBonusId;
      if (offset >= 0 && offset < UPGRADE_RANKS) {
        return {
          trackName: track.name,
          rank: offset + 1,
          maxRank: UPGRADE_RANKS,
        };
      }
    }
  }
  return null;
}

// ── Upgrade crest system ─────────────────────────────────────────────────────
//
// Each crest type is used to upgrade items within specific gear tracks.
// Midnight S1 uses "Dawncrest" as the crest currency.

export interface CrestType {
  /** Unique key matching the track name in lowercase, e.g. "adventurer" */
  id: string;
  /** Human-readable name shown in UI */
  name: string;
  /** The gear track this crest upgrades */
  track: string;
  /** WoW currency IDs that map to this crest (capped + non-capped variants) */
  currencyIds: number[];
}

/**
 * Midnight S1 uses five crest types, one per gear track.
 * Each track's items are upgraded using that track's Dawncrest.
 * Currency IDs from: https://www.wowhead.com/search?q=dawncrest
 * Each crest has a capped (weekly cap) and non-capped variant.
 */
export const CREST_TYPES: CrestType[] = [
  { id: 'adventurer', name: 'Adventurer Dawncrest', track: 'Adventurer', currencyIds: [3383, 3391] },
  { id: 'veteran', name: 'Veteran Dawncrest', track: 'Veteran', currencyIds: [3341, 3342] },
  { id: 'champion', name: 'Champion Dawncrest', track: 'Champion', currencyIds: [3343, 3344] },
  { id: 'hero', name: 'Hero Dawncrest', track: 'Hero', currencyIds: [3345, 3346] },
  { id: 'myth', name: 'Myth Dawncrest', track: 'Myth', currencyIds: [3347, 3348] },
];

/**
 * Reverse lookup: WoW currency ID → crest type ID.
 * Includes both capped and non-capped variants.
 */
export const CURRENCY_ID_TO_CREST: Record<number, string> = Object.fromEntries(
  CREST_TYPES.flatMap((c) => c.currencyIds.map((cid) => [cid, c.id])),
);

/**
 * Cost in Dawncrests per single rank upgrade. Flat 20 per rank for all slots.
 * Upgrading from 1/6 to 6/6 = 5 upgrades × 20 = 100 Dawncrests total.
 */
export const UPGRADE_CREST_COST_PER_RANK = 20;

/**
 * Get the crest type needed to upgrade items in a given track.
 * Returns undefined for tracks with no associated crest.
 */
export function getCrestForTrack(trackName: string): CrestType | undefined {
  return CREST_TYPES.find((c) => c.track === trackName);
}

/**
 * Compute the estimated item level for a given track + rank.
 * Used for display only — SimC resolves ilvl from bonus_ids internally.
 */
export function getIlvlForRank(trackName: string, rank: number): number {
  const track = GEAR_TRACKS.find((t) => t.name === trackName);
  if (!track) return 0;
  const [min, max] = track.ilvlRange;
  if (rank <= 1) return min;
  if (rank >= UPGRADE_RANKS) return max;
  return Math.round(min + ((rank - 1) * (max - min)) / (UPGRADE_RANKS - 1));
}

// ── Tier set definitions ─────────────────────────────────────────────────────
//
// Each tier set is defined by the item IDs that belong to it.
// Tier set pieces always occupy the same 5 slots: head, shoulder, chest, hands, legs.
// SimC activates 2-set and 4-set bonuses automatically when enough pieces are equipped.
//
// To update for a new raid tier: replace TIER_SETS with the new item IDs.
// Item IDs are the same across all difficulty levels (Normal/Heroic/Mythic);
// difficulty is determined by bonus_ids, not item IDs.

export interface TierSetDefinition {
  /** Unique identifier for this set, e.g. "midnight_s1_warrior" */
  id: string;
  /** Human-readable name shown in UI */
  name: string;
  /** All item IDs belonging to this set (one per slot: head, shoulder, chest, hands, legs) */
  itemIds: number[];
}

/**
 * All tier sets for the current season.
 *
 * NOTE: The app auto-detects which sets are relevant based on the user's imported items.
 * List ALL class tier sets here — only sets with matching items will appear in the UI.
 *
 * Item IDs sourced from SimC game data (item_data.inc) for Midnight S1.
 * If an item ID is wrong or missing, the set simply won't be detected for that class.
 */
export const TIER_SETS: TierSetDefinition[] = [
  // ── Midnight S1 Raid: Zul'Aman Ascendant ──
  // Death Knight — Scales of the Amani Serpent
  { id: 'mn_s1_dk', name: 'Scales of the Amani Serpent', itemIds: [240012, 240013, 240014, 240015, 240016] },
  // Demon Hunter — Feathers of the Amani Eagle
  { id: 'mn_s1_dh', name: 'Feathers of the Amani Eagle', itemIds: [240022, 240023, 240024, 240025, 240026] },
  // Druid — Plumage of the Amani Dragonhawk
  { id: 'mn_s1_druid', name: 'Plumage of the Amani Dragonhawk', itemIds: [240032, 240033, 240034, 240035, 240036] },
  // Evoker — Crest of the Amani Lynx
  { id: 'mn_s1_evoker', name: 'Crest of the Amani Lynx', itemIds: [240042, 240043, 240044, 240045, 240046] },
  // Hunter — Fangs of the Amani Bear
  { id: 'mn_s1_hunter', name: 'Fangs of the Amani Bear', itemIds: [240052, 240053, 240054, 240055, 240056] },
  // Mage — Visage of the Amani Hex Lord
  { id: 'mn_s1_mage', name: 'Visage of the Amani Hex Lord', itemIds: [240062, 240063, 240064, 240065, 240066] },
  // Monk — Wraps of the Amani Storm
  { id: 'mn_s1_monk', name: 'Wraps of the Amani Storm', itemIds: [240072, 240073, 240074, 240075, 240076] },
  // Paladin — Aegis of the Amani War Bear
  { id: 'mn_s1_paladin', name: 'Aegis of the Amani War Bear', itemIds: [240082, 240083, 240084, 240085, 240086] },
  // Priest — Vestments of the Amani Spirit
  { id: 'mn_s1_priest', name: 'Vestments of the Amani Spirit', itemIds: [240092, 240093, 240094, 240095, 240096] },
  // Rogue — Guise of the Amani Shadow
  { id: 'mn_s1_rogue', name: 'Guise of the Amani Shadow', itemIds: [240102, 240103, 240104, 240105, 240106] },
  // Shaman — Regalia of the Amani Thunder
  { id: 'mn_s1_shaman', name: 'Regalia of the Amani Thunder', itemIds: [240112, 240113, 240114, 240115, 240116] },
  // Warlock — Bindings of the Amani Darkness
  { id: 'mn_s1_warlock', name: 'Bindings of the Amani Darkness', itemIds: [240122, 240123, 240124, 240125, 240126] },
  // Warrior — Plates of the Amani Warlord
  { id: 'mn_s1_warrior', name: 'Plates of the Amani Warlord', itemIds: [240132, 240133, 240134, 240135, 240136] },
];

/** Build a quick lookup: itemId → tierSetId. Computed once at import time. */
const _tierSetLookup = new Map<number, string>();
for (const set of TIER_SETS) {
  for (const itemId of set.itemIds) {
    _tierSetLookup.set(itemId, set.id);
  }
}

/**
 * Look up which tier set an item belongs to, if any.
 * Returns the tier set ID or undefined.
 */
export function getTierSetId(itemId: number): string | undefined {
  return _tierSetLookup.get(itemId);
}

/**
 * Get a tier set definition by ID.
 */
export function getTierSetById(id: string): TierSetDefinition | undefined {
  return TIER_SETS.find((s) => s.id === id);
}

/** Slots that can be enchanted in Midnight S1. */
export const ENCHANTABLE_SLOTS = [
  'head',
  'shoulder',
  'chest',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'main_hand',
  'off_hand',
] as const;
