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
}

export const GEM_PRESETS: GemPreset[] = [
  // ── Eversong Diamond (meta/primary — Unique-Equipped) ──
  { id: 240983, name: 'Indecipherable Eversong Diamond', stat: 'Primary', color: 'prismatic' },
  { id: 240967, name: 'Powerful Eversong Diamond', stat: 'Primary + Crit', color: 'prismatic' },
  { id: 240971, name: 'Stoic Eversong Diamond', stat: 'Primary + Speed', color: 'prismatic' },
  { id: 240969, name: 'Telluric Eversong Diamond', stat: 'Primary + Mana', color: 'prismatic' },
  // ── Flawless Peridot (Haste-primary) ──
  { id: 240888, name: 'Flawless Quick Peridot', stat: 'Haste', color: 'prismatic' },
  { id: 240890, name: 'Flawless Deadly Peridot', stat: 'Haste + Crit', color: 'prismatic' },
  { id: 240892, name: 'Flawless Masterful Peridot', stat: 'Haste + Mastery', color: 'prismatic' },
  { id: 240894, name: 'Flawless Versatile Peridot', stat: 'Haste + Vers', color: 'prismatic' },
  // ── Flawless Amethyst (Mastery-primary) ──
  { id: 240896, name: 'Flawless Masterful Amethyst', stat: 'Mastery', color: 'prismatic' },
  { id: 240898, name: 'Flawless Deadly Amethyst', stat: 'Mastery + Crit', color: 'prismatic' },
  { id: 240900, name: 'Flawless Quick Amethyst', stat: 'Mastery + Haste', color: 'prismatic' },
  { id: 240902, name: 'Flawless Versatile Amethyst', stat: 'Mastery + Vers', color: 'prismatic' },
  // ── Flawless Garnet (Crit-primary) ──
  { id: 240904, name: 'Flawless Deadly Garnet', stat: 'Crit', color: 'prismatic' },
  { id: 240906, name: 'Flawless Quick Garnet', stat: 'Crit + Haste', color: 'prismatic' },
  { id: 240908, name: 'Flawless Masterful Garnet', stat: 'Crit + Mastery', color: 'prismatic' },
  { id: 240910, name: 'Flawless Versatile Garnet', stat: 'Crit + Vers', color: 'prismatic' },
  // ── Flawless Lapis (Versatility-primary) ──
  { id: 240912, name: 'Flawless Versatile Lapis', stat: 'Versatility', color: 'prismatic' },
  { id: 240914, name: 'Flawless Deadly Lapis', stat: 'Vers + Crit', color: 'prismatic' },
  { id: 240916, name: 'Flawless Quick Lapis', stat: 'Vers + Haste', color: 'prismatic' },
  { id: 240918, name: 'Flawless Masterful Lapis', stat: 'Vers + Mastery', color: 'prismatic' },
  // ── Regular quality Peridot ──
  { id: 240856, name: 'Quick Peridot', stat: 'Haste', color: 'prismatic' },
  { id: 240858, name: 'Deadly Peridot', stat: 'Haste + Crit', color: 'prismatic' },
  { id: 240860, name: 'Masterful Peridot', stat: 'Haste + Mastery', color: 'prismatic' },
  { id: 240862, name: 'Versatile Peridot', stat: 'Haste + Vers', color: 'prismatic' },
  // ── Regular quality Amethyst ──
  { id: 240864, name: 'Masterful Amethyst', stat: 'Mastery', color: 'prismatic' },
  { id: 240866, name: 'Deadly Amethyst', stat: 'Mastery + Crit', color: 'prismatic' },
  { id: 240868, name: 'Quick Amethyst', stat: 'Mastery + Haste', color: 'prismatic' },
  { id: 240870, name: 'Versatile Amethyst', stat: 'Mastery + Vers', color: 'prismatic' },
  // ── Regular quality Garnet ──
  { id: 240872, name: 'Deadly Garnet', stat: 'Crit', color: 'prismatic' },
  { id: 240874, name: 'Quick Garnet', stat: 'Crit + Haste', color: 'prismatic' },
  { id: 240876, name: 'Masterful Garnet', stat: 'Crit + Mastery', color: 'prismatic' },
  { id: 240878, name: 'Versatile Garnet', stat: 'Crit + Vers', color: 'prismatic' },
  // ── Regular quality Lapis ──
  { id: 240880, name: 'Versatile Lapis', stat: 'Versatility', color: 'prismatic' },
  { id: 240882, name: 'Deadly Lapis', stat: 'Vers + Crit', color: 'prismatic' },
  { id: 240884, name: 'Quick Lapis', stat: 'Vers + Haste', color: 'prismatic' },
  { id: 240886, name: 'Masterful Lapis', stat: 'Vers + Mastery', color: 'prismatic' },
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
