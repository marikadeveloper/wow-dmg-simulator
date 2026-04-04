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
    bonusId: 12801,
    ilvlRange: [276, 289],
    source: 'Mythic Raid / M+10 vault',
  },
  {
    name: 'Hero',
    bonusId: 12793,
    ilvlRange: [263, 276],
    source: 'Heroic Raid / M+6–9',
  },
  {
    name: 'Champion',
    bonusId: 12785,
    ilvlRange: [250, 263],
    source: 'Normal Raid / M0–M+5',
  },
  {
    name: 'Veteran',
    bonusId: 12777,
    ilvlRange: [237, 250],
    source: 'Heroic Dungeon / Hard Prey',
  },
  {
    name: 'Adventurer',
    bonusId: 12769,
    ilvlRange: [224, 237],
    source: 'World events / Normal Prey',
  },
];

// ── Socket bonus_id ──────────────────────────────────────────────────────────

/** The bonus_id that adds an extra socket to an item. */
export const SOCKET_BONUS_ID = 6935;

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

/**
 * Extended gem lookup map including Q2 quality variants.
 * In-game, Q2 gems have consecutive IDs (base + 1) for gems with even IDs
 * (Peridot, Amethyst, Garnet, Lapis families). Diamond IDs are irregular
 * and don't follow this pattern.
 */
export const GEM_LOOKUP = new Map<number, GemPreset>();
for (const gem of GEM_PRESETS) {
  GEM_LOOKUP.set(gem.id, gem);
  // Only add Q2 for even-ID gems (secondary gems follow the +1 = Q2 pattern)
  if (gem.id % 2 === 0) {
    GEM_LOOKUP.set(gem.id + 1, { ...gem, id: gem.id + 1, name: `${gem.name} (Q2)` });
  }
}

// ── Enchant presets ──────────────────────────────────────────────────────────

export interface EnchantPreset {
  id: number; // SimC enchant_id
  name: string;
  slot: string; // target slot category: "finger", "head", "chest", etc.
  stat: string; // primary stat for display
  wowheadItemId: number; // Wowhead item ID for tooltip display
}

export const ENCHANT_PRESETS: EnchantPreset[] = [
  // ── Head ──
  { id: 7988, name: 'Blessing of Speed', slot: 'head', stat: 'Speed', wowheadItemId: 243978 },
  { id: 7989, name: 'Blessing of Speed (Q2)', slot: 'head', stat: 'Speed', wowheadItemId: 243978 },
  { id: 7958, name: 'Hex of Leeching', slot: 'head', stat: 'Leech', wowheadItemId: 243948 },
  { id: 7959, name: 'Hex of Leeching (Q2)', slot: 'head', stat: 'Leech', wowheadItemId: 243948 },
  { id: 7960, name: 'Empowered Hex of Leeching', slot: 'head', stat: 'Leech', wowheadItemId: 243951 },
  { id: 7961, name: 'Empowered Hex of Leeching (Q2)', slot: 'head', stat: 'Leech', wowheadItemId: 243951 },
  { id: 7990, name: 'Empowered Blessing of Speed', slot: 'head', stat: 'Speed', wowheadItemId: 243981 },
  { id: 7991, name: 'Empowered Blessing of Speed (Q2)', slot: 'head', stat: 'Speed', wowheadItemId: 243981 },
  { id: 8014, name: 'Rune of Avoidance', slot: 'head', stat: 'Avoidance', wowheadItemId: 244004 },
  { id: 8015, name: 'Rune of Avoidance (Q2)', slot: 'head', stat: 'Avoidance', wowheadItemId: 244004 },
  { id: 8016, name: 'Empowered Rune of Avoidance', slot: 'head', stat: 'Avoidance', wowheadItemId: 244007 },
  { id: 8017, name: 'Empowered Rune of Avoidance (Q2)', slot: 'head', stat: 'Avoidance', wowheadItemId: 244007 },
  // ── Shoulder ──
  { id: 7970, name: 'Flight of the Eagle', slot: 'shoulder', stat: 'Speed', wowheadItemId: 243961 },
  { id: 7971, name: 'Flight of the Eagle (Q2)', slot: 'shoulder', stat: 'Speed', wowheadItemId: 243961 },
  { id: 7972, name: "Akil'zon's Swiftness", slot: 'shoulder', stat: 'Speed', wowheadItemId: 243963 },
  { id: 7973, name: "Akil'zon's Swiftness (Q2)", slot: 'shoulder', stat: 'Speed', wowheadItemId: 243963 },
  { id: 7998, name: "Nature's Grace", slot: 'shoulder', stat: 'Avoidance', wowheadItemId: 243988 },
  { id: 7999, name: "Nature's Grace (Q2)", slot: 'shoulder', stat: 'Avoidance', wowheadItemId: 243988 },
  { id: 8000, name: "Amirdrassil's Grace", slot: 'shoulder', stat: 'Avoidance', wowheadItemId: 243991 },
  { id: 8001, name: "Amirdrassil's Grace (Q2)", slot: 'shoulder', stat: 'Avoidance', wowheadItemId: 243991 },
  { id: 8028, name: 'Thalassian Recovery', slot: 'shoulder', stat: 'Leech', wowheadItemId: 244018 },
  { id: 8029, name: 'Thalassian Recovery (Q2)', slot: 'shoulder', stat: 'Leech', wowheadItemId: 244018 },
  { id: 8030, name: "Silvermoon's Mending", slot: 'shoulder', stat: 'Leech', wowheadItemId: 244021 },
  { id: 8031, name: "Silvermoon's Mending (Q2)", slot: 'shoulder', stat: 'Leech', wowheadItemId: 244021 },
  // ── Chest ──
  { id: 7956, name: 'Mark of Nalorakk', slot: 'chest', stat: 'Str + Stamina', wowheadItemId: 243946 },
  { id: 7957, name: 'Mark of Nalorakk (Q2)', slot: 'chest', stat: 'Str + Stamina', wowheadItemId: 243946 },
  { id: 7984, name: 'Mark of the Rootwarden', slot: 'chest', stat: 'Agi + Speed', wowheadItemId: 243975 },
  { id: 7985, name: 'Mark of the Rootwarden (Q2)', slot: 'chest', stat: 'Agi + Speed', wowheadItemId: 243975 },
  { id: 7986, name: 'Mark of the Worldsoul', slot: 'chest', stat: 'Primary', wowheadItemId: 243977 },
  { id: 7987, name: 'Mark of the Worldsoul (Q2)', slot: 'chest', stat: 'Primary', wowheadItemId: 243977 },
  { id: 8012, name: 'Mark of the Magister', slot: 'chest', stat: 'Int + Mana', wowheadItemId: 244003 },
  { id: 8013, name: 'Mark of the Magister (Q2)', slot: 'chest', stat: 'Int + Mana', wowheadItemId: 244003 },
  // ── Rings ──
  { id: 7964, name: 'Amani Mastery', slot: 'finger', stat: 'Mastery', wowheadItemId: 243955 },
  { id: 7965, name: 'Amani Mastery (Q2)', slot: 'finger', stat: 'Mastery', wowheadItemId: 243955 },
  { id: 7966, name: 'Eyes of the Eagle', slot: 'finger', stat: 'Crit Effect', wowheadItemId: 243957 },
  { id: 7967, name: 'Eyes of the Eagle (Q2)', slot: 'finger', stat: 'Crit Effect', wowheadItemId: 243957 },
  { id: 7968, name: "Zul'jin's Mastery", slot: 'finger', stat: 'Mastery', wowheadItemId: 243959 },
  { id: 7969, name: "Zul'jin's Mastery (Q2)", slot: 'finger', stat: 'Mastery', wowheadItemId: 243959 },
  { id: 7994, name: "Nature's Wrath", slot: 'finger', stat: 'Crit', wowheadItemId: 243984 },
  { id: 7995, name: "Nature's Wrath (Q2)", slot: 'finger', stat: 'Crit', wowheadItemId: 243984 },
  { id: 7996, name: "Nature's Fury", slot: 'finger', stat: 'Crit', wowheadItemId: 243987 },
  { id: 7997, name: "Nature's Fury (Q2)", slot: 'finger', stat: 'Crit', wowheadItemId: 243987 },
  { id: 8020, name: 'Thalassian Haste', slot: 'finger', stat: 'Haste', wowheadItemId: 244010 },
  { id: 8021, name: 'Thalassian Haste (Q2)', slot: 'finger', stat: 'Haste', wowheadItemId: 244010 },
  { id: 8022, name: 'Thalassian Versatility', slot: 'finger', stat: 'Versatility', wowheadItemId: 244013 },
  { id: 8023, name: 'Thalassian Versatility (Q2)', slot: 'finger', stat: 'Versatility', wowheadItemId: 244013 },
  { id: 8024, name: "Silvermoon's Alacrity", slot: 'finger', stat: 'Haste', wowheadItemId: 244015 },
  { id: 8025, name: "Silvermoon's Alacrity (Q2)", slot: 'finger', stat: 'Haste', wowheadItemId: 244015 },
  { id: 8026, name: "Silvermoon's Tenacity", slot: 'finger', stat: 'Versatility', wowheadItemId: 244017 },
  { id: 8027, name: "Silvermoon's Tenacity (Q2)", slot: 'finger', stat: 'Versatility', wowheadItemId: 244017 },
  // ── Legs (Spellthread — Tailoring) ──
  { id: 7934, name: 'Sunfire Silk Spellthread', slot: 'legs', stat: 'Int + Stamina', wowheadItemId: 240094 },
  { id: 7935, name: 'Sunfire Silk Spellthread (Q2)', slot: 'legs', stat: 'Int + Stamina', wowheadItemId: 240094 },
  { id: 7936, name: 'Arcanoweave Spellthread', slot: 'legs', stat: 'Int + Mana', wowheadItemId: 240154 },
  { id: 7937, name: 'Arcanoweave Spellthread (Q2)', slot: 'legs', stat: 'Int + Mana', wowheadItemId: 240154 },
  { id: 7938, name: 'Bright Linen Spellthread', slot: 'legs', stat: 'Intellect', wowheadItemId: 240156 },
  { id: 7939, name: 'Bright Linen Spellthread (Q2)', slot: 'legs', stat: 'Intellect', wowheadItemId: 240156 },
  // ── Legs (Armor Kit — Leatherworking) ──
  { id: 8158, name: "Forest Hunter's Armor Kit", slot: 'legs', stat: 'Agi/Str + Stamina', wowheadItemId: 244641 },
  { id: 8159, name: "Forest Hunter's Armor Kit (Q2)", slot: 'legs', stat: 'Agi/Str + Stamina', wowheadItemId: 244641 },
  { id: 8160, name: 'Thalassian Scout Armor Kit', slot: 'legs', stat: 'Agi/Str', wowheadItemId: 244644 },
  { id: 8161, name: 'Thalassian Scout Armor Kit (Q2)', slot: 'legs', stat: 'Agi/Str', wowheadItemId: 244644 },
  { id: 8162, name: "Blood Knight's Armor Kit", slot: 'legs', stat: 'Agi/Str + Armor', wowheadItemId: 244643 },
  { id: 8163, name: "Blood Knight's Armor Kit (Q2)", slot: 'legs', stat: 'Agi/Str + Armor', wowheadItemId: 244643 },
  // ── Feet ──
  { id: 7962, name: "Lynx's Dexterity", slot: 'feet', stat: 'Avoidance + Stamina', wowheadItemId: 243953 },
  { id: 7963, name: "Lynx's Dexterity (Q2)", slot: 'feet', stat: 'Avoidance + Stamina', wowheadItemId: 243953 },
  { id: 7992, name: "Shaladrassil's Roots", slot: 'feet', stat: 'Leech + Stamina', wowheadItemId: 243983 },
  { id: 7993, name: "Shaladrassil's Roots (Q2)", slot: 'feet', stat: 'Leech + Stamina', wowheadItemId: 243983 },
  { id: 8018, name: "Farstrider's Hunt", slot: 'feet', stat: 'Speed + Stamina', wowheadItemId: 244009 },
  { id: 8019, name: "Farstrider's Hunt (Q2)", slot: 'feet', stat: 'Speed + Stamina', wowheadItemId: 244009 },
  // ── Weapons ──
  { id: 7978, name: 'Strength of Halazzi', slot: 'main_hand', stat: 'Bleed proc', wowheadItemId: 243969 },
  { id: 7979, name: 'Strength of Halazzi (Q2)', slot: 'main_hand', stat: 'Bleed proc', wowheadItemId: 243969 },
  { id: 7980, name: "Jan'alai's Precision", slot: 'main_hand', stat: 'Crit proc', wowheadItemId: 243971 },
  { id: 7981, name: "Jan'alai's Precision (Q2)", slot: 'main_hand', stat: 'Crit proc', wowheadItemId: 243971 },
  { id: 7982, name: "Berserker's Rage", slot: 'main_hand', stat: 'Haste proc', wowheadItemId: 243973 },
  { id: 7983, name: "Berserker's Rage (Q2)", slot: 'main_hand', stat: 'Haste proc', wowheadItemId: 243973 },
  { id: 8006, name: 'Worldsoul Cradle', slot: 'main_hand', stat: 'Absorb shield', wowheadItemId: 243996 },
  { id: 8007, name: 'Worldsoul Cradle (Q2)', slot: 'main_hand', stat: 'Absorb shield', wowheadItemId: 243996 },
  { id: 8008, name: 'Worldsoul Aegis', slot: 'main_hand', stat: 'Absorb + explosion', wowheadItemId: 243998 },
  { id: 8009, name: 'Worldsoul Aegis (Q2)', slot: 'main_hand', stat: 'Absorb + explosion', wowheadItemId: 243998 },
  { id: 8010, name: 'Worldsoul Tenacity', slot: 'main_hand', stat: 'Vers proc', wowheadItemId: 244001 },
  { id: 8011, name: 'Worldsoul Tenacity (Q2)', slot: 'main_hand', stat: 'Vers proc', wowheadItemId: 244001 },
  { id: 8036, name: "Flames of the Sin'dorei", slot: 'main_hand', stat: 'Fire DoT', wowheadItemId: 244027 },
  { id: 8037, name: "Flames of the Sin'dorei (Q2)", slot: 'main_hand', stat: 'Fire DoT', wowheadItemId: 244027 },
  { id: 8038, name: "Acuity of the Ren'dorei", slot: 'main_hand', stat: 'Primary proc', wowheadItemId: 244029 },
  { id: 8039, name: "Acuity of the Ren'dorei (Q2)", slot: 'main_hand', stat: 'Primary proc', wowheadItemId: 244029 },
  { id: 8040, name: 'Arcane Mastery', slot: 'main_hand', stat: 'Mastery proc', wowheadItemId: 244031 },
  { id: 8041, name: 'Arcane Mastery (Q2)', slot: 'main_hand', stat: 'Mastery proc', wowheadItemId: 244031 },
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
  /** Individual piece names matching itemIds order (head, shoulder, chest, hands, legs) */
  itemNames: string[];
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
  // ── Midnight S1 Raid Tier Sets ──
  // Item ID / name order: [head, shoulder, chest, hands, legs] — matches TIER_SLOT_ORDER
  // Death Knight — Relentless Rider's Lament
  { id: 'mn_s1_dk', name: "Relentless Rider's Lament", itemIds: [249970, 249968, 249973, 249971, 249969], itemNames: ["Relentless Rider's Crown", "Relentless Rider's Dreadthorns", "Relentless Rider's Cuirass", "Relentless Rider's Bonegrasps", "Relentless Rider's Legguards"] },
  // Demon Hunter — Devouring Reaver's Sheathe
  { id: 'mn_s1_dh', name: "Devouring Reaver's Sheathe", itemIds: [250033, 250031, 250036, 250034, 250032], itemNames: ["Devouring Reaver's Intake", "Devouring Reaver's Exhaustplates", "Devouring Reaver's Engine", "Devouring Reaver's Essence Grips", "Devouring Reaver's Pistons"] },
  // Druid — Sprouts of the Luminous Bloom
  { id: 'mn_s1_druid', name: 'Sprouts of the Luminous Bloom', itemIds: [250024, 250022, 250027, 250025, 250023], itemNames: ['Branches of the Luminous Bloom', 'Seedpods of the Luminous Bloom', 'Trunk of the Luminous Bloom', 'Arbortenders of the Luminous Bloom', 'Phloemwraps of the Luminous Bloom'] },
  // Evoker — Livery of the Black Talon
  { id: 'mn_s1_evoker', name: 'Livery of the Black Talon', itemIds: [249997, 249995, 250000, 249998, 249996], itemNames: ['Hornhelm of the Black Talon', 'Beacons of the Black Talon', 'Frenzyward of the Black Talon', "Enforcer's Grips of the Black Talon", 'Greaves of the Black Talon'] },
  // Hunter — Primal Sentry's Camouflage
  { id: 'mn_s1_hunter', name: "Primal Sentry's Camouflage", itemIds: [249988, 249986, 249991, 249989, 249987], itemNames: ["Primal Sentry's Maw", "Primal Sentry's Trophies", "Primal Sentry's Scaleplate", "Primal Sentry's Talonguards", "Primal Sentry's Legguards"] },
  // Mage — Voidbreaker's Accordance
  { id: 'mn_s1_mage', name: "Voidbreaker's Accordance", itemIds: [250060, 250058, 250063, 250061, 250059], itemNames: ["Voidbreaker's Veil", "Voidbreaker's Leyline Nexi", "Voidbreaker's Robe", "Voidbreaker's Gloves", "Voidbreaker's Britches"] },
  // Monk — Way of Ra-den's Chosen
  { id: 'mn_s1_monk', name: "Way of Ra-den's Chosen", itemIds: [250015, 250013, 250018, 250016, 250014], itemNames: ["Fearsome Visage of Ra-den's Chosen", "Aurastones of Ra-den's Chosen", "Battle Garb of Ra-den's Chosen", "Thunderfists of Ra-den's Chosen", "Swiftsweepers of Ra-den's Chosen"] },
  // Paladin — Luminant Verdict's Vestments
  { id: 'mn_s1_paladin', name: "Luminant Verdict's Vestments", itemIds: [249961, 249959, 249964, 249962, 249960], itemNames: ["Luminant Verdict's Unwavering Gaze", "Luminant Verdict's Providence Watch", "Luminant Verdict's Divine Warplate", "Luminant Verdict's Gauntlets", "Luminant Verdict's Greaves"] },
  // Priest — Blind Oath's Burden
  { id: 'mn_s1_priest', name: "Blind Oath's Burden", itemIds: [250051, 250049, 250054, 250052, 250050], itemNames: ["Blind Oath's Winged Crest", "Blind Oath's Seraphguards", "Blind Oath's Raiment", "Blind Oath's Touch", "Blind Oath's Leggings"] },
  // Rogue — Motley of the Grim Jest
  { id: 'mn_s1_rogue', name: 'Motley of the Grim Jest', itemIds: [250006, 250004, 250009, 250007, 250005], itemNames: ['Masquerade of the Grim Jest', 'Venom Casks of the Grim Jest', 'Fantastic Finery of the Grim Jest', 'Sleight of Hand of the Grim Jest', 'Blade Holsters of the Grim Jest'] },
  // Shaman — Mantle of the Primal Core
  { id: 'mn_s1_shaman', name: 'Mantle of the Primal Core', itemIds: [249979, 249977, 249982, 249980, 249978], itemNames: ['Locus of the Primal Core', 'Tempests of the Primal Core', 'Embrace of the Primal Core', 'Earthgrips of the Primal Core', 'Leggings of the Primal Core'] },
  // Warlock — Reign of the Abyssal Immolator
  { id: 'mn_s1_warlock', name: 'Reign of the Abyssal Immolator', itemIds: [250042, 250040, 250045, 250043, 250041], itemNames: ["Abyssal Immolator's Smoldering Flames", "Abyssal Immolator's Fury", "Abyssal Immolator's Dreadrobe", "Abyssal Immolator's Grasps", "Abyssal Immolator's Pillars"] },
  // Warrior — Rage of the Night Ender
  { id: 'mn_s1_warrior', name: 'Rage of the Night Ender', itemIds: [249952, 249950, 249955, 249953, 249951], itemNames: ["Night Ender's Tusks", "Night Ender's Pauldrons", "Night Ender's Breastplate", "Night Ender's Fists", "Night Ender's Chausses"] },
];

/**
 * Tier set slots in canonical order.
 * This order matches the `itemIds` array in each TierSetDefinition.
 */
export const TIER_SLOT_ORDER = ['head', 'shoulder', 'chest', 'hands', 'legs'] as const;

/**
 * Map WoW class keyword (from SimC export) → tier set ID for the current season.
 */
export const CLASS_TO_TIER_SET_ID: Record<string, string> = {
  deathknight: 'mn_s1_dk',
  demonhunter: 'mn_s1_dh',
  druid: 'mn_s1_druid',
  evoker: 'mn_s1_evoker',
  hunter: 'mn_s1_hunter',
  mage: 'mn_s1_mage',
  monk: 'mn_s1_monk',
  paladin: 'mn_s1_paladin',
  priest: 'mn_s1_priest',
  rogue: 'mn_s1_rogue',
  shaman: 'mn_s1_shaman',
  warlock: 'mn_s1_warlock',
  warrior: 'mn_s1_warrior',
};

/**
 * Get the tier item ID for a given class and slot.
 * Returns undefined if the class or slot is not found.
 */
export function getTierItemIdForSlot(className: string, slot: string): number | undefined {
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return undefined;
  const set = TIER_SETS.find((s) => s.id === setId);
  if (!set) return undefined;
  const idx = TIER_SLOT_ORDER.indexOf(slot as typeof TIER_SLOT_ORDER[number]);
  if (idx === -1) return undefined;
  return set.itemIds[idx];
}

/**
 * Get the individual tier piece name for a given class and slot.
 * Returns undefined if the class or slot is not found.
 */
export function getTierPieceNameForSlot(className: string, slot: string): string | undefined {
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return undefined;
  const set = TIER_SETS.find((s) => s.id === setId);
  if (!set) return undefined;
  const idx = TIER_SLOT_ORDER.indexOf(slot as typeof TIER_SLOT_ORDER[number]);
  if (idx === -1) return undefined;
  return set.itemNames[idx];
}

// ── Catalyst: class armor item IDs for ALL armor slots ─────────────────────
//
// Class set items follow a predictable ID pattern: base + slot_offset.
// base = tier_head_id - 5. Offsets:
//   back=0, wrist=1, waist=2, shoulder=3, legs=4, head=5, hands=6, feet=7, chest=8
//
// This covers all catalyzable armor slots — both tier (head/shoulder/chest/hands/legs)
// which grant set bonuses, and non-tier (back/wrist/waist/feet) which give class-themed gear.

const CATALYST_SLOT_OFFSETS: Record<string, number> = {
  back: 0, wrist: 1, waist: 2, shoulder: 3, legs: 4,
  head: 5, hands: 6, feet: 7, chest: 8,
};

/** All slots that the Catalyst can convert armor pieces into. */
export const CATALYST_ARMOR_SLOTS = Object.keys(CATALYST_SLOT_OFFSETS);

/**
 * Get the class armor item ID for any catalyzable slot.
 * Works for both tier slots (head/shoulder/chest/hands/legs) and
 * non-tier slots (back/wrist/waist/feet).
 * Returns undefined if class or slot is not catalyzable.
 */
export function getClassArmorItemId(className: string, slot: string): number | undefined {
  const offset = CATALYST_SLOT_OFFSETS[slot];
  if (offset === undefined) return undefined;
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return undefined;
  const set = TIER_SETS.find((s) => s.id === setId);
  if (!set) return undefined;
  // base = head item ID - 5 (head offset)
  const base = set.itemIds[0] - 5;
  return base + offset;
}

/**
 * Get the class armor item name for any catalyzable slot.
 * For tier slots, returns the tier piece name. For non-tier slots,
 * returns the set name + slot suffix.
 */
export function getClassArmorItemName(className: string, slot: string): string | undefined {
  // For tier slots, use the specific piece name from TIER_SETS
  const tierName = getTierPieceNameForSlot(className, slot);
  if (tierName) return tierName;
  // For non-tier slots, we don't have specific names — use set name + slot
  const setId = CLASS_TO_TIER_SET_ID[className];
  if (!setId) return undefined;
  const set = TIER_SETS.find((s) => s.id === setId);
  if (!set) return undefined;
  return `${set.name} (${slot})`;
}

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

// ── Consumable Presets ──────────────────────────────────────────────────────
// SimC-compatible values extracted from Raidbots. '' = SimC Default, 'disabled' = none.

export interface ConsumablePreset {
  value: string;
  name: string;
}

export const POTION_PRESETS: ConsumablePreset[] = [
  { value: '', name: 'SimC Default' },
  { value: 'lights_potential_2', name: "Light's Potential (Q2)" },
  { value: 'lights_potential_1', name: "Light's Potential (Q1)" },
  { value: 'potion_of_zealotry_2', name: 'Potion of Zealotry (Q2)' },
  { value: 'potion_of_zealotry_1', name: 'Potion of Zealotry (Q1)' },
  { value: 'potion_of_recklessness_2', name: 'Potion of Recklessness (Q2)' },
  { value: 'potion_of_recklessness_1', name: 'Potion of Recklessness (Q1)' },
  { value: 'draught_of_rampant_abandon_2', name: 'Draught of Rampant Abandon (Q2)' },
  { value: 'draught_of_rampant_abandon_1', name: 'Draught of Rampant Abandon (Q1)' },
  { value: 'disabled', name: 'No Potion' },
];

export const FOOD_PRESETS: ConsumablePreset[] = [
  { value: '', name: 'SimC Default' },
  { value: 'silvermoon_parade', name: 'Silvermoon Parade (50 Main Stat)' },
  { value: 'queldorei_medley', name: "Quel'dorei Medley (64 Highest Secondary)" },
  { value: 'blooming_feast', name: 'Blooming Feast (64 Highest Secondary)' },
  { value: 'harandar_celebration', name: 'Harandar Celebration (50 Main Stat)' },
  { value: 'royal_roast', name: 'Royal Roast (50 Main Stat)' },
  { value: 'impossibly_royal_roast', name: 'Impossibly Royal Roast (50 Main Stat)' },
  { value: 'flora_frenzy', name: 'Flora Frenzy (64 Highest Secondary)' },
  { value: 'champions_bento', name: "Champion's Bento (64 Highest Secondary)" },
  { value: 'warped_wise_wings', name: 'Warped Wise Wings (58 Mastery)' },
  { value: 'voidkissed_fish_rolls', name: 'Void-Kissed Fish Rolls (58 Vers)' },
  { value: 'sunseared_lumifin', name: 'Sun-Seared Lumifin (58 Crit)' },
  { value: 'null_and_void_plate', name: 'Null and Void Plate (58 Haste)' },
  { value: 'glitter_skewers', name: 'Glitter Skewers (58 Mastery)' },
  { value: 'felkissed_filet', name: 'Fel-Kissed Filet (58 Haste)' },
  { value: 'buttered_root_crab', name: 'Buttered Root Crab (58 Vers)' },
  { value: 'arcano_cutlets', name: 'Arcano Cutlets (58 Crit)' },
  { value: 'tasty_smoked_tetra', name: 'Tasty Smoked Tetra (58 Crit)' },
  { value: 'crimson_calamari', name: 'Crimson Calamari (58 Haste)' },
  { value: 'braised_blood_hunter', name: 'Braised Blood Hunter (58 Vers)' },
  { value: 'disabled', name: 'No Food' },
];

export const FLASK_PRESETS: ConsumablePreset[] = [
  { value: '', name: 'SimC Default' },
  { value: 'flask_of_the_shattered_sun_2', name: 'Flask of the Shattered Sun (Q2)' },
  { value: 'flask_of_the_shattered_sun_1', name: 'Flask of the Shattered Sun (Q1)' },
  { value: 'flask_of_the_blood_knights_2', name: 'Flask of the Blood Knights (Q2)' },
  { value: 'flask_of_the_blood_knights_1', name: 'Flask of the Blood Knights (Q1)' },
  { value: 'flask_of_the_magisters_2', name: 'Flask of the Magisters (Q2)' },
  { value: 'flask_of_the_magisters_1', name: 'Flask of the Magisters (Q1)' },
  { value: 'flask_of_thalassian_resistance_2', name: 'Flask of Thalassian Resistance (Q2)' },
  { value: 'flask_of_thalassian_resistance_1', name: 'Flask of Thalassian Resistance (Q1)' },
  { value: 'disabled', name: 'No Flask' },
];

export const AUGMENTATION_PRESETS: ConsumablePreset[] = [
  { value: '', name: 'SimC Default' },
  { value: 'void_touched', name: 'Void-Touched Augment Rune' },
  { value: 'crystallized', name: 'Crystallized Augment Rune' },
  { value: 'disabled', name: 'Disabled' },
];

export const WEAPON_RUNE_PRESETS: ConsumablePreset[] = [
  { value: '', name: 'SimC Default' },
  { value: 'main_hand:refulgent_whetstone_2', name: 'Refulgent Whetstone (AP)' },
  { value: 'main_hand:thalassian_phoenix_oil_2', name: 'Thalassian Phoenix Oil (Crit/Haste)' },
  { value: 'main_hand:oil_of_dawn_2', name: 'Oil of Dawn (Holy Damage)' },
  { value: 'main_hand:smugglers_enchanted_edge_2', name: "Smuggler's Enchanted Edge (Damage)" },
  { value: 'main_hand:refulgent_whetstone_2/off_hand:refulgent_whetstone_2', name: '[DW] Refulgent Whetstone (AP)' },
  { value: 'main_hand:thalassian_phoenix_oil_2/off_hand:thalassian_phoenix_oil_2', name: '[DW] Thalassian Phoenix Oil (Crit/Haste)' },
  { value: 'main_hand:oil_of_dawn_2/off_hand:oil_of_dawn_2', name: '[DW] Oil of Dawn (Holy Damage)' },
  { value: 'main_hand:smugglers_enchanted_edge_2/off_hand:smugglers_enchanted_edge_2', name: "[DW] Smuggler's Enchanted Edge (Damage)" },
  { value: 'disabled', name: 'Disabled' },
];

// ── Raid Buffs ─────────────────────────────────────────────────────────────

export interface RaidBuffPreset {
  key: string;
  simcKey: string;
  label: string;
  defaultOn: boolean;
}

export const RAID_BUFFS: RaidBuffPreset[] = [
  { key: 'bloodlust', simcKey: 'override.bloodlust', label: 'Bloodlust', defaultOn: true },
  { key: 'arcane_intellect', simcKey: 'override.arcane_intellect', label: 'Arcane Intellect', defaultOn: true },
  { key: 'power_word_fortitude', simcKey: 'override.power_word_fortitude', label: 'Power Word: Fortitude', defaultOn: true },
  { key: 'mark_of_the_wild', simcKey: 'override.mark_of_the_wild', label: 'Mark of the Wild', defaultOn: true },
  { key: 'battle_shout', simcKey: 'override.battle_shout', label: 'Battle Shout', defaultOn: true },
  { key: 'mystic_touch', simcKey: 'override.mystic_touch', label: 'Mystic Touch (5% Physical)', defaultOn: true },
  { key: 'chaos_brand', simcKey: 'override.chaos_brand', label: 'Chaos Brand (3% Magic)', defaultOn: true },
  { key: 'skyfury', simcKey: 'override.skyfury', label: 'Skyfury', defaultOn: true },
  { key: 'hunters_mark', simcKey: 'override.hunters_mark', label: "Hunter's Mark", defaultOn: true },
  { key: 'bleeding', simcKey: 'override.bleeding', label: 'Bleeding', defaultOn: true },
];

// ── Trinket-Specific Options ───────────────────────────────────────────────

export interface CrucibleMode {
  key: string;
  simcKey: string;
  label: string;
}

/** Crucible of Erratic Energies (item_id=264507) mode toggles. */
export const CRUCIBLE_ITEM_ID = 264507;
export const CRUCIBLE_MODES: CrucibleMode[] = [
  { key: 'violence', simcKey: 'midnight.crucible_of_erratic_energies_violence', label: 'Violence' },
  { key: 'sustenance', simcKey: 'midnight.crucible_of_erratic_energies_sustenance', label: 'Sustenance' },
  { key: 'predation', simcKey: 'midnight.crucible_of_erratic_energies_predation', label: 'Predation' },
];

/**
 * Class+spec pairs that dual-wield weapons in the off-hand slot.
 * Uses "class:spec" keys to avoid ambiguity (e.g., "frost" is both DK and Mage).
 * These specs MUST have an off-hand weapon equipped to simulate correctly.
 */
export const DUAL_WIELD_SPECS = new Set([
  'warrior:fury',           // Titan's Grip / Single-Minded Fury
  'rogue:assassination',
  'rogue:outlaw',
  'rogue:subtlety',
  'deathknight:frost',      // Death Knight Frost (dual-wield variant)
  'monk:windwalker',
  'monk:brewmaster',        // Can dual-wield
  'demonhunter:havoc',
  'demonhunter:vengeance',
  'shaman:enhancement',
  'hunter:survival',        // Can use off-hand weapons
]);

/**
 * Specs that use ranged weapons (bows/guns/crossbows) as their primary weapon.
 * These specs cannot effectively use melee weapons — dungeon/raid loot table
 * main_hand and off_hand items should be excluded for these specs since
 * M+ dungeons and raids don't drop ranged weapons in the general loot pool.
 */
export const RANGED_WEAPON_SPECS = new Set([
  'hunter:beast_mastery',
  'hunter:marksmanship',
]);

/** Slots that can be enchanted in Midnight S1. Off-hand cannot have weapon enchants. */
export const ENCHANTABLE_SLOTS = [
  'head',
  'shoulder',
  'chest',
  'legs',
  'feet',
  'finger1',
  'finger2',
  'main_hand',
] as const;
